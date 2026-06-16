import type { Competition, Match, MatchStatus } from "../types/domain";

export type Section = "overview" | "fixtures" | "results" | "standings" | "bracket" | "scorers";

export const sectionPath = (competition: Competition, editionId: string, section: Section) =>
  `/competitions/${competition.slug}/${editionId}${section === "overview" ? "" : `/${section}`}`;

export const sectionSupported = (competition: Competition, section: Section) => {
  if (section === "standings") return competition.capabilities.hasStandings;
  if (section === "bracket") return competition.capabilities.hasBracket;
  if (section === "scorers") return competition.capabilities.hasScorers;
  return true;
};

export const availableSections = (competition: Competition): Section[] =>
  (["overview", "fixtures", "results", "standings", "bracket", "scorers"] as const).filter((section) =>
    sectionSupported(competition, section),
  );

export const formatKickoff = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

export const formatDate = (value: string, long = false) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: long ? "long" : "short",
    month: "short",
    day: "numeric",
    year: long ? "numeric" : undefined,
  }).format(new Date(value));

export const formatUpdated = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

export const groupMatchesByDate = (matches: Match[]) =>
  matches.reduce<Record<string, Match[]>>((groups, match) => {
    const key = match.kickoff.slice(0, 10);
    (groups[key] ??= []).push(match);
    return groups;
  }, {});

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

export const matchWinnerId = (homeScore: number, awayScore: number, homeId: string, awayId: string, homePens?: number, awayPens?: number) => {
  if (homeScore === awayScore && homePens !== undefined && awayPens !== undefined) {
    return homePens > awayPens ? homeId : awayId;
  }
  return homeScore > awayScore ? homeId : awayId;
};
