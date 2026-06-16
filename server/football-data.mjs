import { cached } from "./cache.mjs";
import { ProviderError } from "./errors.mjs";
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

const titleCase = (value = "") =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const colorFor = (id) => {
  const hue = Math.abs(Number(id) || hashString(String(id))) % 360;
  return `hsl(${hue} 58% 46%)`;
};

const hashString = (value) =>
  [...value].reduce((total, character) => (total * 31 + character.charCodeAt(0)) | 0, 0);

const normalizeTeam = (team = {}) => ({
  id: `fd-team-${team.id ?? hashString(team.name ?? "team")}`,
  name: team.name ?? "TBD",
  shortName: team.shortName ?? team.name ?? "TBD",
  code: team.tla ?? team.name?.slice(0, 3).toUpperCase() ?? "TBD",
  badge: colorFor(team.id ?? team.name),
  crest: team.crest ?? undefined,
  externalIds: { footballData: String(team.id ?? "") },
});

const normalizeStage = (stage) => STAGE_LABELS[stage] ?? titleCase(stage) ?? "Competition";

const normalizeGroup = (group) => {
  if (!group) return undefined;
  return group
    .replace(/^GROUP_/, "Group ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const scorePart = (score, side) =>
  score?.fullTime?.[side] ??
  score?.regularTime?.[side] ??
  score?.extraTime?.[side] ??
  undefined;

const normalizeMatch = (raw, competitionId, editionId) => {
  const stage = normalizeStage(raw.stage);
  const group = normalizeGroup(raw.group);
  const matchday = raw.matchday ? `Matchday ${raw.matchday}` : undefined;
  return {
    id: `fd-${raw.id}`,
    competitionId,
    editionId,
    stage,
    round: group ?? matchday ?? stage,
    group,
    kickoff: raw.utcDate,
    status: statusMap[raw.status] ?? "UPCOMING",
    minute:
      raw.minute === null || raw.minute === undefined
        ? undefined
        : Number(raw.minute),
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
    externalIds: { footballData: String(raw.id) },
    lastUpdated: raw.lastUpdated,
  };
};

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

const getResource = (url, env, ttlMs) =>
  cached(`football-data:${url}`, ttlMs, () => providerFetch(url, env));

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

  const matchesPayload = await getResource(matchesUrl, env, 55_000);
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

  const matchesWithStage = matchesPayload.matches.map((raw) => ({
    rawId: raw.id,
    rawStage: raw.stage,
    match: normalizeMatch(raw, competitionId, editionId),
  }));
  const matches = matchesWithStage.map((entry) => entry.match);
  const latestUpdate = matches
    .map((match) => match.lastUpdated)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    matches,
    standings: normalizeStandings(standingsPayload, config.format),
    ties: normalizeTies(matchesWithStage),
    scorers: normalizeScorers(scorersPayload),
    events: {},
    updatedAt: latestUpdate ?? new Date().toISOString(),
    source: "live",
    provider: "football-data.org",
  };
};
