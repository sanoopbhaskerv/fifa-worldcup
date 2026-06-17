import { cached } from "./cache.mjs";
import { ProviderError } from "./errors.mjs";
import { getLiveFixtureStates, similarity } from "./api-football.mjs";
import { providerCompetitions, seasonYear } from "./provider-config.mjs";

const STAGE_LABELS = {
  REGULAR_SEASON: "League",
  LEAGUE_STAGE: "League phase",
  GROUP_STAGE: "Group stage",
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  ROUND_OF_16: "Round of 16",
  QUARTER_FINALS: "Quarter-finals",
  SEMI_FINALS: "Semi-finals",
  THIRD_PLACE: "Third place",
  FINAL: "Final",
  QUALIFICATION: "Qualification",
  PLAYOFFS: "Playoffs",
};

const KNOCKOUT_STAGES = new Set([
  "LAST_32",
  "LAST_16",
  "ROUND_OF_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
]);

const statusMap = {
  IN_PLAY: "LIVE",
  PAUSED: "LIVE",
  LIVE: "LIVE",
  TIMED: "UPCOMING",
  SCHEDULED: "UPCOMING",
  FINISHED: "COMPLETED",
  AWARDED: "COMPLETED",
  POSTPONED: "POSTPONED",
  SUSPENDED: "POSTPONED",
  CANCELLED: "CANCELLED",
};

const LIVE_PROVIDER_STATUSES = new Set(["IN_PLAY", "PAUSED", "LIVE"]);
const LIVE_API_FOOTBALL_PHASES = new Set(["1H", "HT", "2H", "ET", "BT", "P"]);
const COMPLETED_API_FOOTBALL_PHASES = new Set(["FT", "AET", "PEN"]);

/**
 * Converts provider enum values into human-readable title case labels.
 *
 * @param value - Provider enum value such as `GROUP_STAGE`.
 * @returns Title-cased display label.
 */
const titleCase = (value = "") =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

/**
 * Generates a stable fallback badge color from a provider id or name.
 *
 * @param id - Provider id or name used as the deterministic color seed.
 * @returns HSL color string for fallback team badges.
 */
const colorFor = (id) => {
  const hue = Math.abs(Number(id) || hashString(String(id))) % 360;
  return `hsl(${hue} 58% 46%)`;
};

/**
 * Produces a deterministic numeric hash for string fallback ids.
 *
 * @param value - String value to hash.
 * @returns Signed 32-bit hash value.
 */
const hashString = (value) =>
  [...value].reduce((total, character) => (total * 31 + character.charCodeAt(0)) | 0, 0);

/**
 * Normalizes football-data.org team payloads into the app team model.
 *
 * @param team - Raw football-data.org team object.
 * @returns Normalized app team record.
 */
const normalizeTeam = (team = {}) => ({
  id: `fd-team-${team.id ?? hashString(team.name ?? "team")}`,
  name: team.name ?? "TBD",
  shortName: team.shortName ?? team.name ?? "TBD",
  code: team.tla ?? team.name?.slice(0, 3).toUpperCase() ?? "TBD",
  badge: colorFor(team.id ?? team.name),
  crest: team.crest ?? undefined,
  externalIds: { footballData: String(team.id ?? "") },
});

/**
 * Normalizes football-data.org stage enum values.
 *
 * @param stage - Raw stage enum from football-data.org.
 * @returns User-facing stage label.
 */
const normalizeStage = (stage) => STAGE_LABELS[stage] ?? titleCase(stage) ?? "Competition";

/**
 * Normalizes football-data.org group enum values such as `GROUP_A`.
 *
 * @param group - Raw group enum or missing value.
 * @returns User-facing group label, or `undefined` when no group exists.
 */
const normalizeGroup = (group) => {
  if (!group) return undefined;
  return group
    .replace(/^GROUP_/, "Group ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

/**
 * Reads the most useful score part for one side.
 *
 * @param score - Raw football-data.org score object.
 * @param side - Score side to read, either `home` or `away`.
 * @returns Full-time, regular-time, or extra-time score when present.
 */
const scorePart = (score, side) =>
  score?.fullTime?.[side] ??
  score?.regularTime?.[side] ??
  score?.extraTime?.[side] ??
  undefined;

/**
 * Normalizes one football-data.org match into the app match model.
 *
 * @param raw - Raw football-data.org match object.
 * @param competitionId - Internal competition id assigned to the match.
 * @param editionId - Edition id assigned to the match.
 * @returns Normalized app match record.
 */
const normalizeMatch = (raw, competitionId, editionId) => {
  const stage = normalizeStage(raw.stage);
  const group = normalizeGroup(raw.group);
  const matchday = raw.matchday ? `Matchday ${raw.matchday}` : undefined;
  const rawMatchNumber = raw.matchNumber ?? raw.number;
  return {
    id: `fd-${raw.id}`,
    competitionId,
    editionId,
    stage,
    round: group ?? matchday ?? stage,
    group,
    matchday: raw.matchday ?? undefined,
    matchNumber:
      rawMatchNumber === null || rawMatchNumber === undefined
        ? undefined
        : String(rawMatchNumber),
    kickoff: raw.utcDate,
    status: statusMap[raw.status] ?? "UPCOMING",
    minute:
      raw.minute === null || raw.minute === undefined
        ? undefined
        : Number(raw.minute),
    extraMinute:
      raw.extraMinute === null || raw.extraMinute === undefined
        ? undefined
        : Number(raw.extraMinute),
    livePhase: raw.livePhase ?? undefined,
    home: normalizeTeam(raw.homeTeam),
    away: normalizeTeam(raw.awayTeam),
    homeScore: scorePart(raw.score, "home"),
    awayScore: scorePart(raw.score, "away"),
    homePenalties: raw.score?.penalties?.home ?? undefined,
    awayPenalties: raw.score?.penalties?.away ?? undefined,
    venue: raw.venue ?? raw.homeTeam?.venue ?? "Venue TBC",
    city: raw.area?.name ?? raw.competition?.area?.name ?? "",
    attendance: raw.attendance ?? undefined,
    officials: (raw.referees ?? []).map((referee) => referee.name).filter(Boolean),
    externalIds: {
      footballData: String(raw.id),
      apiFootball:
        raw.apiFootballFixtureId === null || raw.apiFootballFixtureId === undefined
          ? undefined
          : String(raw.apiFootballFixtureId),
    },
    lastUpdated: raw.lastUpdated,
  };
};

/**
 * Resolves the app match status from an API-Football live status code.
 *
 * @param phase - API-Football `fixture.status.short` value.
 * @returns Normalized app status, or `undefined` when the phase is not mapped.
 */
const statusFromLivePhase = (phase) => {
  if (LIVE_API_FOOTBALL_PHASES.has(phase)) return "LIVE";
  if (COMPLETED_API_FOOTBALL_PHASES.has(phase)) return "COMPLETED";
  if (["PST", "SUSP"].includes(phase)) return "POSTPONED";
  return undefined;
};

/**
 * Converts normalized live phase status back into the provider enum shape used downstream.
 *
 * @param status - Normalized app status derived from API-Football.
 * @param fallback - Existing football-data.org raw status.
 * @returns Raw status value accepted by `statusMap`.
 */
const providerStatusFromLiveStatus = (status, fallback) => {
  if (status === "LIVE") return "LIVE";
  if (status === "COMPLETED") return "FINISHED";
  if (status === "POSTPONED") return "POSTPONED";
  return fallback;
};

/**
 * Scores a football-data.org match against an API-Football live fixture.
 *
 * @param match - Raw football-data.org match payload.
 * @param fixture - API-Football live fixture candidate.
 * @returns Match confidence score, where higher values are stronger.
 */
const liveFixtureMatchScore = (match, fixture) => {
  const kickoffDelta = Math.abs(
    Date.parse(match.utcDate) - Date.parse(fixture.fixture?.date ?? ""),
  );
  const dateBonus = Number.isFinite(kickoffDelta) && kickoffDelta <= 4 * 60 * 60_000 ? 4 : 0;
  return (
    similarity(match.homeTeam?.name, fixture.teams?.home?.name) +
    similarity(match.awayTeam?.name, fixture.teams?.away?.name) +
    dateBonus
  );
};

/**
 * Finds the best API-Football live fixture for a football-data.org match.
 *
 * @param match - Raw football-data.org match payload.
 * @param liveFixtures - API-Football live fixture candidates for the competition.
 * @returns Matching API-Football fixture, or `undefined` when confidence is too low.
 */
const findLiveFixtureState = (match, liveFixtures) => {
  const candidates = liveFixtures
    .map((fixture) => ({ fixture, score: liveFixtureMatchScore(match, fixture) }))
    .sort((left, right) => right.score - left.score);
  return candidates[0]?.score >= 10 ? candidates[0].fixture : undefined;
};

/**
 * Merges API-Football live minute and score data into football-data.org matches.
 *
 * @param matchesPayload - Raw football-data.org matches payload.
 * @param competitionId - Internal competition id used for API-Football league mapping.
 * @param editionId - Edition id whose season should be matched.
 * @param env - Provider configuration passed to API-Football.
 * @returns Matches payload enriched with live phase, minute, extra time, score, and API fixture id.
 */
const withApiFootballLiveStates = async (matchesPayload, competitionId, editionId, env) => {
  if (!env.apiFootballKey) return matchesPayload;

  let liveFixtures;
  try {
    liveFixtures = await getLiveFixtureStates(competitionId, seasonYear(editionId), env);
  } catch (error) {
    if (
      error instanceof ProviderError &&
      ["DETAIL_NOT_AVAILABLE", "DETAIL_BUDGET_REACHED", "RATE_LIMITED"].includes(error.code)
    ) {
      return matchesPayload;
    }
    throw error;
  }
  if (!liveFixtures.length) return matchesPayload;

  return {
    ...matchesPayload,
    matches: (matchesPayload.matches ?? []).map((match) => {
      const fixture = findLiveFixtureState(match, liveFixtures);
      if (!fixture) return match;

      const phase = fixture.fixture?.status?.short;
      const nextStatus = statusFromLivePhase(phase) ?? match.status;
      const elapsed = fixture.fixture?.status?.elapsed;
      const extra = fixture.fixture?.status?.extra;
      return {
        ...match,
        status: providerStatusFromLiveStatus(nextStatus, match.status),
        minute:
          elapsed === null || elapsed === undefined ? match.minute : Number(elapsed),
        extraMinute:
          extra === null || extra === undefined ? undefined : Number(extra),
        livePhase: phase ?? undefined,
        score: {
          ...match.score,
          fullTime: {
            home: fixture.goals?.home ?? match.score?.fullTime?.home,
            away: fixture.goals?.away ?? match.score?.fullTime?.away,
          },
        },
        apiFootballFixtureId: fixture.fixture?.id,
      };
    }),
  };
};

/**
 * Determines table zone semantics for a position.
 *
 * @param position - One-based table position.
 * @param total - Number of teams in the table.
 * @param format - Competition format from provider configuration.
 * @param grouped - Whether the table represents a group stage.
 * @returns App zone label used for standings display.
 */
const zoneFor = (position, total, format, grouped) => {
  if (grouped) return position <= 2 ? "qualified" : "eliminated";
  if (format === "league-knockout") {
    if (position <= 8) return "qualified";
    if (position <= 24) return "playoff";
    return "eliminated";
  }
  if (position === 1) return "champion";
  if (position <= 4) return "qualified";
  if (position > total - 3) return "relegated";
  return "none";
};

/**
 * Normalizes only the `TOTAL` standings tables from football-data.org.
 *
 * @param payload - Raw standings endpoint response.
 * @param format - Competition format from provider configuration.
 * @returns Flattened app standings rows.
 */
const normalizeStandings = (payload, format) => {
  const totalTables = (payload.standings ?? []).filter(
    (standing) => standing.type === "TOTAL",
  );
  return totalTables.flatMap((standing) => {
    const group = normalizeGroup(standing.group);
    return (standing.table ?? []).map((row) => ({
      position: row.position,
      group,
      team: normalizeTeam(row.team),
      played: row.playedGames,
      won: row.won,
      drawn: row.draw,
      lost: row.lost,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      points: row.points,
      form: String(row.form ?? "")
        .split(",")
        .filter((result) => ["W", "D", "L"].includes(result))
        .slice(-5),
      zone: zoneFor(
        row.position,
        standing.table?.length ?? 0,
        format,
        Boolean(group),
      ),
    }));
  });
};

/**
 * Builds a team-id to group-name map from match payloads.
 *
 * @param matchesPayload - Raw matches endpoint response.
 * @returns Map from football-data.org team id to normalized group label.
 */
const groupByTeamIdFromMatches = (matchesPayload) => {
  const groups = new Map();
  for (const match of matchesPayload.matches ?? []) {
    const group = normalizeGroup(match.group);
    if (!group) continue;
    for (const team of [match.homeTeam, match.awayTeam]) {
      if (team?.id !== null && team?.id !== undefined) {
        groups.set(String(team.id), group);
      }
    }
  }
  return groups;
};

/**
 * Applies match-derived groups when standings are returned as one flattened table.
 *
 * @param standings - Normalized standings rows.
 * @param matchesPayload - Raw matches endpoint response used to infer groups.
 * @param format - Competition format from provider configuration.
 * @returns Standings rows grouped, sorted, and re-positioned when group data is inferable.
 */
const applyMatchDerivedStandingGroups = (standings, matchesPayload, format) => {
  if (standings.some((standing) => standing.group)) return standings;
  const groups = groupByTeamIdFromMatches(matchesPayload);
  if (!groups.size) return standings;

  const grouped = standings
    .map((standing) => ({
      ...standing,
      group: groups.get(standing.team.externalIds?.footballData ?? ""),
    }))
    .sort((left, right) => {
      if (left.group && right.group && left.group !== right.group) {
        return left.group.localeCompare(right.group, undefined, {
          numeric: true,
        });
      }
      if (left.group && !right.group) return -1;
      if (!left.group && right.group) return 1;
      const points = right.points - left.points;
      if (points !== 0) return points;
      const goalDifference =
        right.goalsFor -
        right.goalsAgainst -
        (left.goalsFor - left.goalsAgainst);
      if (goalDifference !== 0) return goalDifference;
      const goalsFor = right.goalsFor - left.goalsFor;
      if (goalsFor !== 0) return goalsFor;
      return left.team.name.localeCompare(right.team.name);
    });
  const groupSizes = grouped.reduce((sizes, standing) => {
    if (standing.group) sizes.set(standing.group, (sizes.get(standing.group) ?? 0) + 1);
    return sizes;
  }, new Map());
  const positions = new Map();

  return grouped.map((standing) => {
    if (!standing.group) return standing;
    const nextPosition = (positions.get(standing.group) ?? 0) + 1;
    positions.set(standing.group, nextPosition);
    return {
      ...standing,
      position: nextPosition,
      zone: zoneFor(
        nextPosition,
        groupSizes.get(standing.group) ?? 0,
        format,
        true,
      ),
    };
  });
};

/**
 * Normalizes provider top-scorer rows.
 *
 * @param payload - Raw scorers endpoint response.
 * @returns App scorer rows ordered by provider rank.
 */
const normalizeScorers = (payload) =>
  (payload.scorers ?? []).map((entry, index) => ({
    rank: index + 1,
    id: `fd-player-${entry.player?.id ?? index}`,
    name: entry.player?.name ?? "Unknown player",
    team: normalizeTeam(entry.team),
    goals: entry.goals ?? 0,
    assists: entry.assists ?? undefined,
    matches: entry.playedMatches ?? 0,
    minutes: undefined,
    penalties: entry.penalties ?? undefined,
  }));

/**
 * Normalizes knockout-stage matches into bracket ties.
 *
 * @param matches - Normalized matches paired with their raw stage metadata.
 * @returns Knockout ties for bracket rendering.
 */
const normalizeTies = (matches) =>
  matches
    .filter((match) => KNOCKOUT_STAGES.has(match.rawStage))
    .map((entry, index) => {
      const match = entry.match;
      const homeScore = match.homeScore ?? 0;
      const awayScore = match.awayScore ?? 0;
      const winnerId =
        homeScore === awayScore
          ? (match.homePenalties ?? 0) > (match.awayPenalties ?? 0)
            ? match.home.id
            : (match.awayPenalties ?? 0) > 0
              ? match.away.id
              : ""
          : homeScore > awayScore
            ? match.home.id
            : match.away.id;
      return {
        id: `fd-tie-${entry.rawId}`,
        round: match.stage,
        order: index,
        home: match.home,
        away: match.away,
        homeScore,
        awayScore,
        homePenalties: match.homePenalties,
        awayPenalties: match.awayPenalties,
        winnerId,
        date: match.kickoff,
      };
    });

/**
 * Assigns canonical match numbers to provider matches that do not expose them.
 *
 * @param matches - Normalized matches paired with their raw stage metadata.
 * @returns Matches sorted by kickoff with one-based canonical match numbers filled in.
 */
const withCanonicalMatchNumbers = (matches) =>
  [...matches]
    .sort((left, right) => {
      const kickoff = Date.parse(left.match.kickoff) - Date.parse(right.match.kickoff);
      if (kickoff !== 0) return kickoff;
      return String(left.rawId).localeCompare(String(right.rawId), undefined, { numeric: true });
    })
    .map((entry, index) => ({
      ...entry,
      match: {
        ...entry.match,
        matchNumber: entry.match.matchNumber ?? String(index + 1),
      },
    }));

/**
 * Extracts a numeric live minute from football-data.org match detail payload shapes.
 *
 * @param payload - Match detail payload returned by football-data.org.
 * @returns Minute value when discoverable, otherwise `undefined`.
 */
const minuteFromMatchDetail = (payload) => {
  const match = payload?.match ?? payload;
  const candidates = [
    match?.minute,
    match?.time?.minute,
    match?.status?.minute,
    match?.score?.minute,
  ];
  for (const value of candidates) {
    if (value === null || value === undefined) continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return undefined;
};

/**
 * Fetches per-match detail for live matches missing minute values.
 *
 * @param matchesPayload - Raw matches endpoint payload.
 * @param env - Provider configuration passed to football-data.org fetches.
 * @returns Matches payload with live-minute gaps patched when detail data exists.
 */
const withDetailedLiveMinutes = async (matchesPayload, env) => {
  const matches = matchesPayload.matches ?? [];
  const liveMissingMinute = matches.filter(
    (match) =>
      LIVE_PROVIDER_STATUSES.has(match.status) &&
      (match.minute === null || match.minute === undefined),
  );
  if (!liveMissingMinute.length) return matchesPayload;

  const resolvedMinutes = await Promise.all(
    liveMissingMinute.map(async (match) => {
      const detailUrl = `${env.footballDataBaseUrl}/matches/${match.id}`;
      const detailPayload = await optionalResource(
        getResource(detailUrl, env, 15_000),
        null,
      );
      return [String(match.id), minuteFromMatchDetail(detailPayload)];
    }),
  );
  const minuteById = new Map(
    resolvedMinutes.filter((entry) => entry[1] !== undefined),
  );
  if (!minuteById.size) return matchesPayload;

  return {
    ...matchesPayload,
    matches: matches.map((match) => {
      const minute = minuteById.get(String(match.id));
      return minute === undefined ? match : { ...match, minute };
    }),
  };
};

/**
 * Calls football-data.org and maps HTTP/provider errors into `ProviderError`.
 *
 * @param url - Fully qualified football-data.org API URL.
 * @param env - Provider configuration with API key and base URL.
 * @returns Parsed football-data.org response body.
 * @throws ProviderError when configuration, rate limit, or provider errors occur.
 */
const providerFetch = async (url, env) => {
  if (!env.footballDataKey) {
    throw new ProviderError(
      "FOOTBALL_DATA_API_KEY is not configured.",
      503,
      "MISSING_PROVIDER_KEY",
    );
  }
  const response = await fetch(url, {
    headers: { "X-Auth-Token": env.footballDataKey },
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after") ?? undefined;
    if (response.status === 429) {
      throw new ProviderError(
        "football-data.org rate limit reached.",
        429,
        "RATE_LIMITED",
        retryAfter,
      );
    }
    throw new ProviderError(
      body.message ?? `football-data.org returned ${response.status}.`,
      response.status >= 500 ? 502 : response.status,
      "FOOTBALL_DATA_ERROR",
    );
  }
  return body;
};

/**
 * Reads and caches a provider resource for the requested TTL.
 *
 * @param url - Fully qualified provider resource URL.
 * @param env - Provider configuration passed to the fetcher.
 * @param ttlMs - Cache duration for successful responses.
 * @returns Cached or newly fetched provider response.
 */
const getResource = (url, env, ttlMs) =>
  cached(`football-data:${url}`, ttlMs, () => providerFetch(url, env));

/**
 * Returns fallback data for optional provider resources with unsupported status codes.
 *
 * @param promise - Provider resource promise.
 * @param fallback - Value returned for unsupported optional resources.
 * @returns Provider result or fallback value.
 */
const optionalResource = async (promise, fallback) => {
  try {
    return await promise;
  } catch (error) {
    if (
      error instanceof ProviderError &&
      [400, 403, 404].includes(error.status)
    ) {
      return fallback;
    }
    throw error;
  }
};

/**
 * Returns normalized live competition data from football-data.org.
 *
 * @param competitionId - Internal competition id used for provider mapping.
 * @param editionId - Edition or season id requested by the app.
 * @param env - Provider configuration with football-data.org credentials.
 * @returns Complete normalized live competition payload.
 * @throws ProviderError when the competition or edition is unsupported.
 */
export const getLiveCompetitionData = async (
  competitionId,
  editionId,
  env,
) => {
  const config = providerCompetitions[competitionId];
  if (!config) {
    throw new ProviderError(
      "This competition is not covered by the primary provider.",
      404,
      "UNSUPPORTED_COMPETITION",
    );
  }

  const season = seasonYear(editionId);
  const base = `${env.footballDataBaseUrl}/competitions/${config.footballDataCode}`;
  const matchesUrl = `${base}/matches?season=${season}`;
  const standingsUrl = `${base}/standings?season=${season}`;
  const scorersUrl = `${base}/scorers?season=${season}&limit=30`;

  const matchesPayload = await withDetailedLiveMinutes(
    await withApiFootballLiveStates(
      await getResource(matchesUrl, env, 55_000),
      competitionId,
      editionId,
      env,
    ),
    env,
  );
  if (!matchesPayload.matches?.length) {
    throw new ProviderError(
      "No live provider data is available for this edition yet.",
      404,
      "EDITION_NOT_AVAILABLE",
    );
  }

  const [standingsPayload, scorersPayload] = await Promise.all([
    optionalResource(getResource(standingsUrl, env, 10 * 60_000), {
      standings: [],
    }),
    optionalResource(getResource(scorersUrl, env, 60 * 60_000), {
      scorers: [],
    }),
  ]);

  const matchesWithStage = withCanonicalMatchNumbers(matchesPayload.matches.map((raw) => ({
    rawId: raw.id,
    rawStage: raw.stage,
    match: normalizeMatch(raw, competitionId, editionId),
  })));
  const matches = matchesWithStage.map((entry) => entry.match);
  const latestUpdate = matches
    .map((match) => match.lastUpdated)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    matches,
    standings: applyMatchDerivedStandingGroups(
      normalizeStandings(standingsPayload, config.format),
      matchesPayload,
      config.format,
    ),
    ties: normalizeTies(matchesWithStage),
    scorers: normalizeScorers(scorersPayload),
    events: {},
    updatedAt: latestUpdate ?? new Date().toISOString(),
    source: "live",
    provider: "football-data.org",
  };
};
