import { useState } from "react";
import { storage } from "../utils/storage";

export const useFavorites = () => {
  const [favorites, setFavorites] = useState(storage.getFavorites);
  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      storage.setFavorites(next);
      return next;
    });
  };
  return { favorites, toggleFavorite };
};
