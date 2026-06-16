import { competitionCatalog } from "../mocks/catalog";
import { buildCompetitionData } from "../mocks/data";
import type { FootballDataProvider } from "./football-provider";

/**
 * Simulates provider latency so loading states can be exercised locally.
 *
 * @param milliseconds - Delay duration.
 * @returns Promise that resolves after the requested delay.
 */
const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

/** Bundled deterministic provider used for fallback and offline-friendly browsing. */
export class MockFootballDataProvider implements FootballDataProvider {
  /**
   * Returns the full static competition catalog.
   *
   * @returns Supported competition catalog.
   */
  async getCompetitions() {
    await delay(120);
    return competitionCatalog;
  }

  /**
   * Builds deterministic mock data for a competition edition.
   *
   * @param competitionId - Internal competition id to load.
   * @param editionId - Edition or season id to load.
   * @returns Mock competition data for the requested edition.
   */
  async getCompetitionData(competitionId: string, editionId: string) {
    await delay(180);
    const competition = competitionCatalog.find((item) => item.id === competitionId);
    if (!competition) throw new Error("Competition not found");
    if (!competition.editions.some((edition) => edition.id === editionId)) {
      throw new Error("Edition not found");
    }
    return buildCompetitionData(competition, editionId);
  }

  /**
   * Returns mock timeline events and an honest partial-data notice.
   *
   * @param match - Match whose mock events should be returned.
   * @returns Partial match detail payload for demo mode.
   */
  async getMatchDetails(match: import("../types/domain").Match) {
    const competition = competitionCatalog.find((item) => item.id === match.competitionId);
    const data = competition ? buildCompetitionData(competition, match.editionId) : null;
    return {
      events: data?.events[match.id] ?? [],
      lineups: [],
      statistics: [],
      officials: match.officials ?? [],
      source: "mock" as const,
      provider: "Built-in demo data",
      updatedAt: data?.updatedAt ?? new Date().toISOString(),
      notice: "Detailed lineups and statistics are not part of the demo provider.",
    };
  }
}
