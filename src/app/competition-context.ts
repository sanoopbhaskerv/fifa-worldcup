import { useOutletContext } from "react-router-dom";
import type { CompetitionData } from "../types/domain";

export interface CompetitionContextValue {
  data: CompetitionData;
  editionId: string;
  updatedAt: number;
  isFetching: boolean;
}

export const useCompetition = () => useOutletContext<CompetitionContextValue>();
