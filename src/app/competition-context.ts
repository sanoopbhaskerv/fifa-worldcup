import { useOutletContext } from "react-router-dom";
import type { CompetitionData } from "../types/domain";

export interface CompetitionContextValue {
  data: CompetitionData;
  editionId: string;
  updatedAt: number;
  isFetching: boolean;
  refetch: () => Promise<unknown>;
}

export const useCompetition = () => useOutletContext<CompetitionContextValue>();
