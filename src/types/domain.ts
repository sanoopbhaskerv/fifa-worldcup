export type CompetitionCategory = "International" | "Club";
export type CompetitionFormat = "league" | "group-knockout" | "knockout" | "league-knockout";

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

export interface CompetitionEdition {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

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

export type MatchStatus = "LIVE" | "UPCOMING" | "COMPLETED" | "POSTPONED" | "CANCELLED";

export interface Match {
  id: string;
  competitionId: string;
  editionId: string;
  stage: string;
  round: string;
  group?: string;
  kickoff: string;
  status: MatchStatus;
  minute?: number;
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

export type StandingZone = "champion" | "qualified" | "playoff" | "eliminated" | "relegated" | "none";

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

export interface LineupPlayer {
  id: string;
  name: string;
  number?: number;
  position?: string;
  grid?: string;
}

export interface TeamLineup {
  teamId: string;
  teamName: string;
  crest?: string;
  formation?: string;
  coach?: string;
  starters: LineupPlayer[];
  substitutes: LineupPlayer[];
}

export interface TeamStatistics {
  teamId: string;
  teamName: string;
  crest?: string;
  values: Record<string, string | number | null>;
}

export type DataSource = "live" | "mock";

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
