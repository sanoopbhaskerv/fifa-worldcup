import { useOutletContext } from "react-router-dom";
import type { CompetitionData } from "../types/domain";

export interface CompetitionContextValue {
  data: CompetitionData;
  editionId: string;
  updatedAt: number;
  isFetching: boolean;
  refetch: () => Promise<unknown>;
}

/**
 * Reads the active competition payload exposed by `CompetitionLayout`.
 *
 * @returns Competition data, edition metadata, and refresh state from the route outlet.
 */
export const useCompetition = () => useOutletContext<CompetitionContextValue>();
