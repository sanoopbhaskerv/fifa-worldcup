import type { Competition, CompetitionData, Match, MatchDetails } from "../types/domain";

export interface FootballDataProvider {
  getCompetitions(): Promise<Competition[]>;
  getCompetitionData(competitionId: string, editionId: string): Promise<CompetitionData>;
  getMatchDetails(match: Match): Promise<MatchDetails>;
}
