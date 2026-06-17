import type { Competition, Match, MatchStatus } from "../types/domain";

export type Section = "overview" | "fixtures" | "results" | "standings" | "bracket" | "scorers";

/**
 * Builds the canonical route for a competition section.
 *
 * @param competition - Competition whose slug should appear in the route.
 * @param editionId - Selected edition or season identifier.
 * @param section - App section to link to.
 * @returns Absolute client route for the requested competition section.
 */
export const sectionPath = (competition: Competition, editionId: string, section: Section) =>
  `/competitions/${competition.slug}/${editionId}${section === "overview" ? "" : `/${section}`}`;

/**
 * Checks whether a route section should be visible for a competition.
 *
 * @param competition - Competition with feature capability flags.
 * @param section - Section being evaluated for navigation.
 * @returns `true` when the section can be rendered for the competition.
 */
export const sectionSupported = (competition: Competition, section: Section) => {
  if (section === "standings") return competition.capabilities.hasStandings;
  if (section === "bracket") return competition.capabilities.hasBracket;
  if (section === "scorers") return competition.capabilities.hasScorers;
  return true;
};

/**
 * Derives the ordered list of navigation sections supported by a competition.
 *
 * @param competition - Competition whose capabilities determine available sections.
 * @returns Ordered section ids used by desktop, tab, and bottom navigation.
 */
export const availableSections = (competition: Competition): Section[] =>
  (["overview", "fixtures", "results", "standings", "bracket", "scorers"] as const).filter((section) =>
    sectionSupported(competition, section),
  );

/**
 * Formats a kickoff timestamp as a local time label.
 *
 * @param value - ISO timestamp or date string accepted by `Date`.
 * @returns Locale-aware kickoff time, such as `7:00 PM`.
 */
export const formatKickoff = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

/**
 * Resolves a live minute value using provider minute first, then kickoff elapsed time.
 *
 * @param minute - Explicit live minute from the data provider.
 * @param kickoff - Match kickoff timestamp used as a fallback source.
 * @param nowMs - Epoch time used for deterministic tests.
 * @returns Minute number for live labels, or `undefined` when kickoff is invalid.
 */
export const resolveLiveMinute = (
  minute: number | undefined,
  kickoff: string,
  nowMs = Date.now(),
) => {
  if (minute !== undefined) return minute;
  const kickoffMs = Date.parse(kickoff);
  if (Number.isNaN(kickoffMs)) return undefined;
  const elapsed = Math.floor((nowMs - kickoffMs) / 60_000);
  if (elapsed < 0) return 0;
  return Math.min(120, elapsed);
};

/**
 * Formats an ISO date or timestamp for date-group headings.
 *
 * @param value - ISO date or timestamp accepted by `Date`.
 * @param long - Whether to include weekday and year in the label.
 * @returns Locale-aware date label for headings and match metadata.
 */
export const formatDate = (value: string, long = false) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: long ? "long" : "short",
    month: "short",
    day: "numeric",
    year: long ? "numeric" : undefined,
  }).format(new Date(value));

/**
 * Formats provider update timestamps for freshness indicators.
 *
 * @param value - ISO timestamp returned by the data provider.
 * @returns Short locale-aware date and time label.
 */
export const formatUpdated = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

/**
 * Groups matches by their UTC calendar date key.
 *
 * @param matches - Matches to group by kickoff date.
 * @returns Record keyed by `YYYY-MM-DD`, preserving the input order per day.
 */
export const groupMatchesByDate = (matches: Match[]) =>
  matches.reduce<Record<string, Match[]>>((groups, match) => {
    const key = match.kickoff.slice(0, 10);
    (groups[key] ??= []).push(match);
    return groups;
  }, {});

/**
 * Applies status, text, and stage filters to a match list.
 *
 * @param matches - Source match list to filter.
 * @param status - Specific match status or `ALL`.
 * @param search - Free-text query matched against teams and round names.
 * @param stage - Specific stage name or `ALL`.
 * @returns Matches that satisfy all active filters.
 */
export const filterMatches = (
  matches: Match[],
  status: "ALL" | MatchStatus,
  search: string,
  stage: string,
) =>
  matches.filter((match) => {
    const statusMatches = status === "ALL" || match.status === status;
    const query = search.trim().toLowerCase();
    const searchMatches =
      !query ||
      match.home.name.toLowerCase().includes(query) ||
      match.away.name.toLowerCase().includes(query) ||
      match.round.toLowerCase().includes(query);
    const stageMatches = stage === "ALL" || match.stage === stage;
    return statusMatches && searchMatches && stageMatches;
  });

/**
 * Resolves the winning team id from regular scores and optional penalties.
 *
 * @param homeScore - Home team's regular or aggregate score.
 * @param awayScore - Away team's regular or aggregate score.
 * @param homeId - Home team identifier to return when the home team wins.
 * @param awayId - Away team identifier to return when the away team wins.
 * @param homePens - Optional home penalty shootout score for tied matches.
 * @param awayPens - Optional away penalty shootout score for tied matches.
 * @returns Identifier of the winning team.
 */
export const matchWinnerId = (homeScore: number, awayScore: number, homeId: string, awayId: string, homePens?: number, awayPens?: number) => {
  if (homeScore === awayScore && homePens !== undefined && awayPens !== undefined) {
    return homePens > awayPens ? homeId : awayId;
  }
  return homeScore > awayScore ? homeId : awayId;
};
