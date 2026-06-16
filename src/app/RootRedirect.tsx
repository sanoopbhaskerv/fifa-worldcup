import { Navigate } from "react-router-dom";
import { storage } from "../utils/storage";

export const RootRedirect = () => {
  const stored = storage.getSelection();
  return <Navigate replace to={stored ? `/competitions/${stored.competitionSlug}/${stored.editionId}` : "/competitions/world-cup/2026"} />;
};
