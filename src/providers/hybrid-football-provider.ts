import type { MatchDetails } from "../types/domain";
import type { FootballDataProvider } from "./football-provider";

/**
 * Produces a safe user-facing message for provider fallback notices.
 *
 * @param error - Unknown error thrown by a provider.
 * @returns Error message when available, otherwise a generic provider message.
 */
const safeMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Provider unavailable";

/** Tries a live provider first and falls back to a secondary provider on failure. */
export class HybridFootballDataProvider implements FootballDataProvider {
  /**
   * Creates a provider wrapper with live-first behavior and fallback data.
   *
   * @param live - Primary provider used for live data.
   * @param fallback - Secondary provider used when live data is unavailable.
   */
  constructor(
    private readonly live: FootballDataProvider,
    private readonly fallback: FootballDataProvider,
  ) {}

  /**
   * Returns catalog data from the live provider.
   *
   * @returns Supported competition catalog.
   */
  getCompetitions() {
    return this.live.getCompetitions();
  }

  /**
   * Returns live competition data, or demo data with a notice if live data fails.
   *
   * @param competitionId - Internal competition id to load.
   * @param editionId - Edition or season id to load.
   * @returns Live data when available, otherwise fallback data with a notice.
   */
  async getCompetitionData(competitionId: string, editionId: string) {
    try {
      return await this.live.getCompetitionData(competitionId, editionId);
    } catch (error) {
      const data = await this.fallback.getCompetitionData(competitionId, editionId);
      return {
        ...data,
        notice: `Live data unavailable: ${safeMessage(error)} Showing saved demo data.`,
      };
    }
  }

  /**
   * Returns live details, or a partial detail payload if enrichment fails.
   *
   * @param match - Match to enrich with detail-provider data.
   * @returns Match detail payload from the live provider or a partial fallback.
   */
  async getMatchDetails(match: Parameters<FootballDataProvider["getMatchDetails"]>[0]) {
    try {
      return await this.live.getMatchDetails(match);
    } catch (error) {
      const details: MatchDetails = {
        events: [],
        lineups: [],
        statistics: [],
        officials: match.officials ?? [],
        source: "live",
        provider: "API-Football",
        updatedAt: new Date().toISOString(),
        notice: `Detailed provider data is unavailable: ${safeMessage(error)}`,
      };
      return details;
    }
  }
}
