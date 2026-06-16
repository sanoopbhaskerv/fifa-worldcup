// @ts-expect-error Reuses the server normalizer in the temporary static-live browser bundle.
import { getLiveMatchDetails } from "../../server/api-football.mjs";
// @ts-expect-error Reuses the server normalizer in the temporary static-live browser bundle.
import { getLiveCompetitionData } from "../../server/football-data.mjs";
import { competitionCatalog } from "../mocks/catalog";
import type { CompetitionData, Match } from "../types/domain";
import type { FootballDataProvider } from "./football-provider";

const env = {
  footballDataKey: import.meta.env.VITE_FOOTBALL_DATA_API_KEY ?? "",
  apiFootballKey: import.meta.env.VITE_API_FOOTBALL_API_KEY ?? "",
  footballDataBaseUrl:
    import.meta.env.VITE_FOOTBALL_DATA_BASE_URL ?? "/football-data/v4",
  apiFootballBaseUrl:
    import.meta.env.VITE_API_FOOTBALL_BASE_URL ?? "/api-football",
  apiFootballDailyBudget: import.meta.env.VITE_API_FOOTBALL_DAILY_BUDGET ?? "90",
};

/** Indicates whether build-time public provider keys are present. */
export const hasStaticLiveKeys = Boolean(
  env.footballDataKey && env.apiFootballKey,
);

/** Temporary static-hosting provider that calls football APIs from the browser bundle. */
export class StaticLiveFootballDataProvider implements FootballDataProvider {
  /**
   * Returns the static catalog because provider mappings are local.
   *
   * @returns Supported competition catalog.
   */
  async getCompetitions() {
    return competitionCatalog;
  }

  /**
   * Loads live competition data using build-time public keys and rewrite base URLs.
   *
   * @param competitionId - Internal competition id to load.
   * @param editionId - Edition or season id to load.
   * @returns Normalized live competition data with a static-mode notice.
   */
  async getCompetitionData(competitionId: string, editionId: string) {
    const competition = competitionCatalog.find((item) => item.id === competitionId);
    if (!competition) throw new Error("Competition not found");
    const data = (await getLiveCompetitionData(
      competitionId,
      editionId,
      env,
    )) as Omit<CompetitionData, "competition">;
    return {
      ...data,
      competition,
      notice:
        "Temporary static live mode is using API keys embedded in the browser bundle. This should be replaced by a backend before public launch.",
    };
  }

  /**
   * Loads live match enrichment using build-time public API-Football credentials.
   *
   * @param match - Match whose kickoff and team names are used for fixture matching.
   * @returns Match detail enrichment from API-Football.
   */
  async getMatchDetails(match: Match) {
    return getLiveMatchDetails(
      {
        matchId: match.id,
        competitionId: match.competitionId,
        kickoff: match.kickoff,
        home: match.home.name,
        away: match.away.name,
      },
      env,
    );
  }
}
