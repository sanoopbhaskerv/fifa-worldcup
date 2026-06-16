import { useEffect, useState } from "react";

/**
 * Tracks browser online/offline state for stale data messaging.
 *
 * @returns `true` when the browser reports an online connection.
 */
export const useOnline = () => {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    /**
     * Synchronizes React state with the browser network state.
     *
     * @returns Nothing; updates component state from `navigator.onLine`.
     */
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
};
