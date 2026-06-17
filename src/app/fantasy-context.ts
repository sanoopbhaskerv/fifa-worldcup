import { useOutletContext } from "react-router-dom";
import type { FantasyGameData } from "../types/fantasy";

export interface FantasyContextValue {
  data: FantasyGameData;
}

/**
 * Reads the active fantasy prediction game payload from the layout outlet.
 *
 * @returns Fantasy game data exposed by `FantasyLayout`.
 */
export const useFantasy = () => useOutletContext<FantasyContextValue>();
