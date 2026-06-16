import { useState } from "react";
import { storage } from "../utils/storage";

/**
 * Manages persisted favorite competition ids.
 *
 * @returns Current favorite ids and a helper for toggling one competition id.
 */
export const useFavorites = () => {
  const [favorites, setFavorites] = useState(storage.getFavorites);

  /**
   * Adds or removes a competition id from the persisted favorites list.
   *
   * @param id - Competition id to add when absent or remove when already saved.
   * @returns Nothing; React state and local storage are updated together.
   */
  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      storage.setFavorites(next);
      return next;
    });
  };
  return { favorites, toggleFavorite };
};
