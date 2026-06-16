import { Navigate } from "react-router-dom";
import { storage } from "../utils/storage";

/**
 * Redirects `/` to the persisted selection or the latest World Cup route.
 *
 * @returns React Router redirect element.
 */
export const RootRedirect = () => {
  const stored = storage.getSelection();
  return <Navigate replace to={stored ? `/competitions/${stored.competitionSlug}/${stored.editionId}` : "/competitions/world-cup/2026"} />;
};
