import type { MatchDetails } from "../types/domain";
import type { FootballDataProvider } from "./football-provider";

const safeMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Provider unavailable";

export class HybridFootballDataProvider implements FootballDataProvider {
  constructor(
    private readonly live: FootballDataProvider,
    private readonly fallback: FootballDataProvider,
  ) {}

  getCompetitions() {
    return this.live.getCompetitions();
  }

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
