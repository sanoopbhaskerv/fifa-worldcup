import { competitionCatalog } from "../mocks/catalog";
import type { CompetitionData, Match, MatchDetails } from "../types/domain";
import type { FootballDataProvider } from "./football-provider";

export const backendApiBaseUrl = (
  import.meta.env.VITE_BACKEND_API_BASE_URL ??
  import.meta.env.VITE_FANTASY_API_BASE_URL ??
  ""
).replace(/\/$/, "");

/** Error type used when same-origin API responses return structured failures. */
class ApiResponseError extends Error {
  /**
   * Creates an API response error from a structured API failure.
   *
   * @param message - User-safe error message from the API response.
   * @param status - HTTP status code returned by the API.
   * @param code - Optional stable API error code.
   */
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

/**
 * Fetches JSON from the local `/api` proxy and normalizes API error payloads.
 *
 * @typeParam T - Expected response body shape.
 * @param url - Same-origin API URL to request.
 * @returns Parsed JSON response body.
 * @throws ApiResponseError when the API returns a non-2xx response.
 */
const request = async <T>(url: string): Promise<T> => {
  const response = await fetch(`${backendApiBaseUrl}${url}`, {
    headers: { accept: "application/json" },
  });
  const body = (await response.json().catch(() => ({}))) as {
    error?: { message?: string; code?: string };
  };
  if (!response.ok) {
    throw new ApiResponseError(
      body.error?.message ?? `Football API returned ${response.status}.`,
      response.status,
      body.error?.code,
    );
  }
  return body as T;
};

/** Browser provider that reads live data from the same-origin Node/API proxy. */
export class ApiFootballDataProvider implements FootballDataProvider {
  /**
   * Returns the static catalog because provider coverage is mapped locally.
   *
   * @returns Supported competition catalog.
   */
  async getCompetitions() {
    return competitionCatalog;
  }

  /**
   * Fetches normalized competition data from the local API proxy.
   *
   * @param competitionId - Internal competition id to load.
   * @param editionId - Edition or season id to load.
   * @returns Normalized competition data with local catalog metadata attached.
   */
  async getCompetitionData(competitionId: string, editionId: string) {
    const competition = competitionCatalog.find((item) => item.id === competitionId);
    if (!competition) throw new Error("Competition not found");
    const data = await request<Omit<CompetitionData, "competition">>(
      `/api/competitions/${encodeURIComponent(competitionId)}/${encodeURIComponent(editionId)}`,
    );
    return { ...data, competition };
  }

  /**
   * Fetches on-demand details for one match from the local API proxy.
   *
   * @param match - Match whose kickoff and team names are used for provider matching.
   * @returns Optional match events, lineups, statistics, and officials.
   */
  async getMatchDetails(match: Match) {
    const params = new URLSearchParams({
      competitionId: match.competitionId,
      kickoff: match.kickoff,
      home: match.home.name,
      away: match.away.name,
    });
    return request<MatchDetails>(
      `/api/matches/${encodeURIComponent(match.id)}/details?${params}`,
    );
  }
}

export { ApiResponseError };
