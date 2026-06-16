import { useQuery } from "@tanstack/react-query";
import { footballProvider } from "../providers";
import type { Match } from "../types/domain";

/**
 * Loads the available competition catalog.
 *
 * @returns TanStack Query result containing supported competitions.
 */
export const useCompetitions = () =>
  useQuery({
    queryKey: ["competitions"],
    queryFn: () => footballProvider.getCompetitions(),
    staleTime: 1000 * 60 * 60,
  });

/**
 * Loads one competition edition and manages live polling while matches are live.
 *
 * @param competitionId - Internal competition id to load.
 * @param editionId - Edition or season id to load.
 * @returns TanStack Query result containing normalized competition data.
 */
export const useCompetitionData = (competitionId: string, editionId: string) =>
  useQuery({
    queryKey: ["competition", competitionId, editionId],
    queryFn: () => footballProvider.getCompetitionData(competitionId, editionId),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24 * 7,
    retry: 2,
    enabled: Boolean(competitionId && editionId),
    refetchInterval: (query) =>
      query.state.data?.source === "live" &&
      query.state.data.matches.some((match) => match.status === "LIVE")
        ? 60_000
        : false,
  });

/**
 * Loads on-demand match details, refreshing more often for live matches.
 *
 * @param match - Match to enrich with events, lineups, statistics, and officials.
 * @returns TanStack Query result containing optional match detail data.
 */
export const useMatchDetails = (match?: Match) =>
  useQuery({
    queryKey: ["match-details", match?.id],
    queryFn: () => footballProvider.getMatchDetails(match!),
    enabled: Boolean(match),
    staleTime: match?.status === "LIVE" ? 55_000 : 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 7,
    retry: 1,
    refetchInterval: match?.status === "LIVE" ? 60_000 : false,
  });
