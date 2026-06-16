import { competitionCatalog } from "../mocks/catalog";
import { buildCompetitionData } from "../mocks/data";
import type { FootballDataProvider } from "./football-provider";

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export class MockFootballDataProvider implements FootballDataProvider {
  async getCompetitions() {
    await delay(120);
    return competitionCatalog;
  }

  async getCompetitionData(competitionId: string, editionId: string) {
    await delay(180);
    const competition = competitionCatalog.find((item) => item.id === competitionId);
    if (!competition) throw new Error("Competition not found");
    if (!competition.editions.some((edition) => edition.id === editionId)) {
      throw new Error("Edition not found");
    }
    return buildCompetitionData(competition, editionId);
  }

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
