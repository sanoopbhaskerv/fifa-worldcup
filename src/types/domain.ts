/** High-level catalog bucket used for filtering competitions. */
export type CompetitionCategory = "International" | "Club";

/** Competition structure used to drive standings, bracket, and routing behavior. */
export type CompetitionFormat = "league" | "group-knockout" | "knockout" | "league-knockout";

/** Feature flags that decide which routes and match-detail sections are visible. */
export interface CompetitionCapabilities {
  hasStandings: boolean;
  hasGroups: boolean;
  hasBracket: boolean;
  hasScorers: boolean;
  hasLineups: boolean;
  hasLiveEvents: boolean;
  hasMatchStats: boolean;
  hasTwoLeggedTies: boolean;
}

/** A concrete season or edition that can be selected for a competition. */
export interface CompetitionEdition {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

/** Catalog metadata for one supported football competition. */
export interface Competition {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  category: CompetitionCategory;
  confederation: string;
  region: string;
  country?: string;
  format: CompetitionFormat;
  summary: string;
  accent: string;
  emblem: string;
  editions: CompetitionEdition[];
  activeEditionId: string;
  capabilities: CompetitionCapabilities;
}

/** Normalized team identity consumed by cards, tables, and detail views. */
export interface Team {
  id: string;
  name: string;
  shortName: string;
  code: string;
  badge: string;
  crest?: string;
  externalIds?: {
    footballData?: string;
    apiFootball?: string;
  };
}

/** Normalized match lifecycle used by filters and live refresh behavior. */
export type MatchStatus = "LIVE" | "UPCOMING" | "COMPLETED" | "POSTPONED" | "CANCELLED";

/** Normalized fixture/result model shared across list, overview, bracket, and detail pages. */
export interface Match {
  id: string;
  competitionId: string;
  editionId: string;
  stage: string;
  round: string;
  group?: string;
  matchday?: number;
  matchNumber?: string;
  kickoff: string;
  status: MatchStatus;
  minute?: number;
  extraMinute?: number;
  livePhase?: string;
  home: Team;
  away: Team;
  homeScore?: number;
  awayScore?: number;
  homePenalties?: number;
  awayPenalties?: number;
  aggregate?: string;
  venue: string;
  city: string;
  attendance?: number;
  officials?: string[];
  externalIds?: {
    footballData?: string;
    apiFootball?: string;
  };
  lastUpdated?: string;
}

/** Display category for a team's position in a table. */
export type StandingZone = "champion" | "qualified" | "playoff" | "eliminated" | "relegated" | "none";

/** Normalized standings row with provider-specific table fields removed. */
export interface Standing {
  position: number;
  group?: string;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: ("W" | "D" | "L")[];
  zone: StandingZone;
}

/** Normalized knockout tie rendered by the bracket view. */
export interface KnockoutTie {
  id: string;
  round: string;
  order: number;
  home: Team;
  away: Team;
  homeScore: number;
  awayScore: number;
  homePenalties?: number;
  awayPenalties?: number;
  aggregate?: string;
  winnerId: string;
  date: string;
}

/** Top-scorer row normalized from provider or mock data. */
export interface Scorer {
  rank: number;
  id: string;
  name: string;
  team: Team;
  goals: number;
  assists?: number;
  matches: number;
  minutes?: number;
  penalties?: number;
}

/** Timeline event shown on match detail pages. */
export interface MatchEvent {
  id: string;
  minute: number;
  extraMinute?: number;
  type: "goal" | "yellow-card" | "red-card" | "substitution";
  teamId: string;
  teamName?: string;
  player: string;
  assist?: string;
  detail?: string;
}

/** Player entry for lineup sections. */
export interface LineupPlayer {
  id: string;
  name: string;
  number?: number;
  position?: string;
  grid?: string;
}

/** Team lineup normalized from API-Football. */
export interface TeamLineup {
  teamId: string;
  teamName: string;
  crest?: string;
  formation?: string;
  coach?: string;
  starters: LineupPlayer[];
  substitutes: LineupPlayer[];
}

/** Team-level match statistics normalized from API-Football. */
export interface TeamStatistics {
  teamId: string;
  teamName: string;
  crest?: string;
  values: Record<string, string | number | null>;
}

/** Identifies whether a response came from a live provider or bundled mock data. */
export type DataSource = "live" | "mock";

/** Optional per-match enrichment returned by the detail provider. */
export interface MatchDetails {
  fixtureId?: string;
  events: MatchEvent[];
  lineups: TeamLineup[];
  statistics: TeamStatistics[];
  officials: string[];
  source: DataSource;
  provider: string;
  updatedAt: string;
  notice?: string;
}

/** Complete normalized data payload for a competition edition. */
export interface CompetitionData {
  competition: Competition;
  matches: Match[];
  standings: Standing[];
  ties: KnockoutTie[];
  scorers: Scorer[];
  events: Record<string, MatchEvent[]>;
  updatedAt: string;
  source: DataSource;
  provider: string;
  notice?: string;
}
