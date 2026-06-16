import type { Competition, CompetitionData, Match, MatchDetails } from "../types/domain";

/** Contract implemented by live, static-live, and mock football data sources. */
export interface FootballDataProvider {
  /**
   * Returns the supported competition catalog.
   *
   * @returns Promise resolving to the supported competitions.
   */
  getCompetitions(): Promise<Competition[]>;

  /**
   * Returns normalized data for one competition edition.
   *
   * @param competitionId - Internal competition id to load.
   * @param editionId - Edition or season id to load.
   * @returns Promise resolving to normalized competition data.
   */
  getCompetitionData(competitionId: string, editionId: string): Promise<CompetitionData>;

  /**
   * Returns optional event, lineup, statistic, and official details for one match.
   *
   * @param match - Match to enrich with detail data.
   * @returns Promise resolving to match detail data.
   */
  getMatchDetails(match: Match): Promise<MatchDetails>;
}
