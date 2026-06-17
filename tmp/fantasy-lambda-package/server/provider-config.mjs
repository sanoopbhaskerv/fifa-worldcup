/** Provider mapping for competitions covered by football-data.org and API-Football. */
export const providerCompetitions = {
  "world-cup": {
    footballDataCode: "WC",
    apiFootballLeagueId: 1,
    format: "group-knockout",
  },
  euros: {
    footballDataCode: "EC",
    apiFootballLeagueId: 4,
    format: "group-knockout",
  },
  "champions-league": {
    footballDataCode: "CL",
    apiFootballLeagueId: 2,
    format: "league-knockout",
  },
  "premier-league": {
    footballDataCode: "PL",
    apiFootballLeagueId: 39,
    format: "league",
  },
  "la-liga": {
    footballDataCode: "PD",
    apiFootballLeagueId: 140,
    format: "league",
  },
  "serie-a": {
    footballDataCode: "SA",
    apiFootballLeagueId: 135,
    format: "league",
  },
  bundesliga: {
    footballDataCode: "BL1",
    apiFootballLeagueId: 78,
    format: "league",
  },
  "ligue-1": {
    footballDataCode: "FL1",
    apiFootballLeagueId: 61,
    format: "league",
  },
};

/**
 * Extracts the season start year from an app edition id.
 *
 * @param editionId - Edition id such as `2026` or `2025-26`.
 * @returns Numeric start year used by provider season parameters.
 */
export const seasonYear = (editionId) => Number(editionId.slice(0, 4));
