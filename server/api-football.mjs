import { cached } from "./cache.mjs";
import { ProviderError } from "./errors.mjs";
import { providerCompetitions } from "./provider-config.mjs";

let budgetDate = new Date().toISOString().slice(0, 10);
let requestsToday = 0;

/**
 * Removes common punctuation and club suffixes for provider name matching.
 *
 * @param value - Raw team or club name.
 * @returns Lowercase normalized name suitable for fuzzy comparisons.
 */
const normalizedName = (value = "") =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(fc|afc|cf|ac|sc|club|football)\b/g, "")
    .replace(/[^a-z0-9]/g, "");

/**
 * Scores two team names for fuzzy fixture matching.
 *
 * @param left - Expected team name from football-data.org.
 * @param right - Candidate team name from API-Football.
 * @returns Similarity score, where higher values represent stronger matches.
 */
const similarity = (left, right) => {
  const a = normalizedName(left);
  const b = normalizedName(right);
  if (!a || !b) return 0;
  if (a === b) return 10;
  if (a.includes(b) || b.includes(a)) return 7;
  const aWords = new Set(left.toLowerCase().split(/\W+/).filter(Boolean));
  const overlap = right
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => aWords.has(word)).length;
  return overlap;
};

/**
 * Enforces the process-local API-Football daily request budget.
 *
 * @param limit - Maximum number of API-Football requests allowed per UTC day.
 * @returns Nothing; increments the request count when budget remains.
 * @throws ProviderError when the daily request budget has already been reached.
 */
const checkBudget = (limit) => {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== budgetDate) {
    budgetDate = today;
    requestsToday = 0;
  }
  if (requestsToday >= limit) {
    throw new ProviderError(
      "The API-Football daily safety budget has been reached.",
      429,
      "DETAIL_BUDGET_REACHED",
    );
  }
  requestsToday += 1;
};

/**
 * Calls API-Football and normalizes transport and provider errors.
 *
 * @param path - API-Football path and query string to append to the base URL.
 * @param env - Provider configuration with key, base URL, and optional budget hook.
 * @returns Parsed API-Football response body.
 * @throws ProviderError when configuration, rate limit, or provider errors occur.
 */
const apiFetch = async (path, env) => {
  if (!env.apiFootballKey) {
    throw new ProviderError(
      "API_FOOTBALL_API_KEY is not configured.",
      503,
      "MISSING_DETAIL_KEY",
    );
  }
  const budget = Number(env.apiFootballDailyBudget ?? 90);
  const limit = Number.isFinite(budget) ? budget : 90;
  if (env.consumeApiFootballBudget) {
    await env.consumeApiFootballBudget(limit);
  } else {
    checkBudget(limit);
  }

  const response = await fetch(`${env.apiFootballBaseUrl}${path}`, {
    headers: { "x-apisports-key": env.apiFootballKey },
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ProviderError(
      `API-Football returned ${response.status}.`,
      response.status === 429 ? 429 : 502,
      response.status === 429 ? "RATE_LIMITED" : "API_FOOTBALL_ERROR",
      response.headers.get("retry-after") ?? undefined,
    );
  }
  const providerErrors = body.errors;
  if (
    providerErrors &&
    ((Array.isArray(providerErrors) && providerErrors.length > 0) ||
      (!Array.isArray(providerErrors) &&
        Object.keys(providerErrors).length > 0))
  ) {
    const message = Array.isArray(providerErrors)
      ? providerErrors.join(", ")
      : Object.values(providerErrors).join(", ");
    throw new ProviderError(message, 422, "DETAIL_NOT_AVAILABLE");
  }
  return body;
};

/**
 * Loads all fixtures for a date so a football-data match can be cross-matched.
 *
 * @param date - ISO date key in `YYYY-MM-DD` format.
 * @param env - Provider configuration passed to API-Football.
 * @returns Cached API-Football fixtures response for the date.
 */
const fixtureCandidates = (date, env) =>
  cached(`api-football:fixtures:${date}`, 5 * 60_000, () =>
    apiFetch(`/fixtures?date=${encodeURIComponent(date)}`, env),
  );

/**
 * Finds the API-Football fixture that best matches a football-data match.
 *
 * @param competitionId - Internal competition id used to apply league bonus scoring.
 * @param date - Match date in `YYYY-MM-DD` format.
 * @param homeName - Expected home team name from football-data.org.
 * @param awayName - Expected away team name from football-data.org.
 * @param env - Provider configuration passed to API-Football.
 * @returns Best matching API-Football fixture, or `null` when confidence is too low.
 */
const findFixture = async (
  competitionId,
  date,
  homeName,
  awayName,
  env,
) => {
  const payload = await fixtureCandidates(date, env);
  const expectedLeague = providerCompetitions[competitionId]?.apiFootballLeagueId;
  const candidates = (payload.response ?? []).map((fixture) => {
    const leagueBonus =
      expectedLeague && fixture.league?.id === expectedLeague ? 6 : 0;
    const score =
      similarity(homeName, fixture.teams?.home?.name) +
      similarity(awayName, fixture.teams?.away?.name) +
      leagueBonus;
    return { fixture, score };
  });
  candidates.sort((left, right) => right.score - left.score);
  return candidates[0]?.score >= 10 ? candidates[0].fixture : null;
};

/**
 * Converts API-Football event type/detail fields into app event types.
 *
 * @param type - Raw API-Football event type.
 * @param detail - Raw API-Football event detail.
 * @returns App event type, or `null` for unsupported provider events.
 */
const eventType = (type, detail) => {
  if (type === "Goal") return "goal";
  if (type === "subst") return "substitution";
  if (type === "Card" && String(detail).toLowerCase().includes("red")) {
    return "red-card";
  }
  if (type === "Card") return "yellow-card";
  return null;
};

/**
 * Normalizes goal, card, and substitution events.
 *
 * @param payload - API-Football events response payload.
 * @returns App timeline events filtered to supported event types.
 */
const normalizeEvents = (payload) =>
  (payload.response ?? []).flatMap((entry, index) => {
    const type = eventType(entry.type, entry.detail);
    if (!type) return [];
    return [
      {
        id: `af-event-${index}-${entry.time?.elapsed ?? 0}`,
        minute: Number(entry.time?.elapsed ?? 0),
        extraMinute: entry.time?.extra ?? undefined,
        type,
        teamId: `af-team-${entry.team?.id ?? ""}`,
        teamName: entry.team?.name ?? undefined,
        player: entry.player?.name ?? "Unknown player",
        assist: entry.assist?.name ?? undefined,
        detail: entry.detail ?? entry.comments ?? undefined,
      },
    ];
  });

/**
 * Normalizes one API-Football lineup player.
 *
 * @param entry - API-Football lineup player wrapper.
 * @returns App lineup player record.
 */
const normalizePlayer = (entry) => ({
  id: `af-player-${entry.player?.id ?? entry.player?.name}`,
  name: entry.player?.name ?? "Unknown player",
  number: entry.player?.number ?? undefined,
  position: entry.player?.pos ?? undefined,
  grid: entry.player?.grid ?? undefined,
});

/**
 * Normalizes team lineup, substitutes, formation, and coach data.
 *
 * @param payload - API-Football lineups response payload.
 * @returns App team lineup records.
 */
const normalizeLineups = (payload) =>
  (payload.response ?? []).map((lineup) => ({
    teamId: `af-team-${lineup.team?.id ?? ""}`,
    teamName: lineup.team?.name ?? "Team",
    crest: lineup.team?.logo ?? undefined,
    formation: lineup.formation ?? undefined,
    coach: lineup.coach?.name ?? undefined,
    starters: (lineup.startXI ?? []).map(normalizePlayer),
    substitutes: (lineup.substitutes ?? []).map(normalizePlayer),
  }));

const wantedStats = new Set([
  "Ball Possession",
  "Total Shots",
  "Shots on Goal",
  "Corner Kicks",
  "Fouls",
  "Yellow Cards",
  "Red Cards",
  "Goalkeeper Saves",
  "Passes %",
  "expected_goals",
]);

/**
 * Normalizes selected team statistics from API-Football.
 *
 * @param payload - API-Football statistics response payload.
 * @returns App team statistics records containing supported stat keys.
 */
const normalizeStatistics = (payload) =>
  (payload.response ?? []).map((teamStats) => ({
    teamId: `af-team-${teamStats.team?.id ?? ""}`,
    teamName: teamStats.team?.name ?? "Team",
    crest: teamStats.team?.logo ?? undefined,
    values: Object.fromEntries(
      (teamStats.statistics ?? [])
        .filter((stat) => wantedStats.has(stat.type))
        .map((stat) => [stat.type, stat.value]),
    ),
  }));

/**
 * Creates a successful partial detail response with an explanatory notice.
 *
 * @param message - Notice explaining why detailed provider data is absent.
 * @returns Empty match detail payload marked as live provider data.
 */
const emptyDetails = (message) => ({
  events: [],
  lineups: [],
  statistics: [],
  officials: [],
  source: "live",
  provider: "API-Football",
  updatedAt: new Date().toISOString(),
  notice: message,
});

/**
 * Returns API-Football enrichment for one match when fixture matching succeeds.
 *
 * @param query - Match lookup fields derived from the primary provider match.
 * @param env - Provider configuration with API-Football credentials and base URL.
 * @returns Match detail enrichment, or a partial payload with a notice.
 * @throws ProviderError when required lookup fields are missing or provider calls fail.
 */
export const getLiveMatchDetails = async (query, env) => {
  const { competitionId, kickoff, home, away } = query;
  if (!competitionId || !kickoff || !home || !away) {
    throw new ProviderError(
      "Match lookup parameters are incomplete.",
      400,
      "INVALID_MATCH_LOOKUP",
    );
  }

  const date = kickoff.slice(0, 10);
  let fixture;
  try {
    fixture = await findFixture(competitionId, date, home, away, env);
  } catch (error) {
    if (
      error instanceof ProviderError &&
      ["DETAIL_NOT_AVAILABLE", "DETAIL_BUDGET_REACHED"].includes(error.code)
    ) {
      return emptyDetails(error.message);
    }
    throw error;
  }

  if (!fixture) {
    return emptyDetails(
      "API-Football does not expose this fixture on the current free-plan date window.",
    );
  }

  const fixtureId = fixture.fixture.id;
  const terminal = ["FT", "AET", "PEN"].includes(fixture.fixture.status?.short);
  const ttl = terminal ? 24 * 60 * 60_000 : 60_000;
  const [eventsPayload, lineupsPayload, statisticsPayload] = await Promise.all([
    cached(`api-football:events:${fixtureId}`, ttl, () =>
      apiFetch(`/fixtures/events?fixture=${fixtureId}`, env),
    ),
    cached(`api-football:lineups:${fixtureId}`, ttl, () =>
      apiFetch(`/fixtures/lineups?fixture=${fixtureId}`, env),
    ),
    cached(`api-football:statistics:${fixtureId}`, ttl, () =>
      apiFetch(`/fixtures/statistics?fixture=${fixtureId}`, env),
    ),
  ]);

  return {
    fixtureId: String(fixtureId),
    events: normalizeEvents(eventsPayload),
    lineups: normalizeLineups(lineupsPayload),
    statistics: normalizeStatistics(statisticsPayload),
    officials: fixture.fixture.referee ? [fixture.fixture.referee] : [],
    source: "live",
    provider: "API-Football",
    updatedAt: new Date().toISOString(),
  };
};
