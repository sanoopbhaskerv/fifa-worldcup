import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { ArrowIcon } from "../components/Icons";
import { clearLegacyPwaCaches } from "../utils/pwa-cache";

/**
 * Registers and manages PWA update prompts for the entire app route tree.
 *
 * @returns Update toast when a newer service worker is ready.
 */
export const PwaUpdatePrompt = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });

  useEffect(() => {
    void clearLegacyPwaCaches();
  }, []);

  const applyUpdate = () => {
    void updateServiceWorker(true);
    window.setTimeout(() => window.location.reload(), 700);
  };

  if (!needRefresh) return null;

  return (
    <div className="update-toast" role="status">
      <div>
        <strong>Update ready</strong>
        <span>A new version of Full Time is available.</span>
      </div>
      <button onClick={applyUpdate}>Update <ArrowIcon /></button>
      <button className="icon-button" onClick={() => setNeedRefresh(false)} aria-label="Dismiss update">×</button>
    </div>
  );
};
