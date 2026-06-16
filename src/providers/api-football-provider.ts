import { competitionCatalog } from "../mocks/catalog";
import type { CompetitionData, Match, MatchDetails } from "../types/domain";
import type { FootballDataProvider } from "./football-provider";

class ApiResponseError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

const request = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
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

export class ApiFootballDataProvider implements FootballDataProvider {
  async getCompetitions() {
    return competitionCatalog;
  }

  async getCompetitionData(competitionId: string, editionId: string) {
    const competition = competitionCatalog.find((item) => item.id === competitionId);
    if (!competition) throw new Error("Competition not found");
    const data = await request<Omit<CompetitionData, "competition">>(
      `/api/competitions/${encodeURIComponent(competitionId)}/${encodeURIComponent(editionId)}`,
    );
    return { ...data, competition };
  }

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
