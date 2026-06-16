import { useQuery } from "@tanstack/react-query";
import { footballProvider } from "../providers";
import type { Match } from "../types/domain";

export const useCompetitions = () =>
  useQuery({
    queryKey: ["competitions"],
    queryFn: () => footballProvider.getCompetitions(),
    staleTime: 1000 * 60 * 60,
  });

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
