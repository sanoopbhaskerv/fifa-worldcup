const CURRENT_CACHE_PREFIX = "full-time-";
const LEGACY_CACHE_NAMES = new Set(["football-data"]);
const LEGACY_CACHE_PREFIXES = ["workbox-"];

/**
 * Determines whether a browser Cache Storage entry belongs to an older app cache strategy.
 *
 * @param cacheName - Cache Storage key returned by the browser.
 * @returns True when the cache should be removed after the current app version starts.
 */
const isLegacyPwaCache = (cacheName: string) => {
  if (cacheName.startsWith(CURRENT_CACHE_PREFIX)) return false;
  if (LEGACY_CACHE_NAMES.has(cacheName)) return true;
  return LEGACY_CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix));
};

/**
 * Deletes legacy PWA caches left by previous service-worker configurations.
 *
 * @returns Promise that settles after every matching cache has been removed.
 */
export const clearLegacyPwaCaches = async () => {
  if (!("caches" in window)) return;

  const cacheNames = await window.caches.keys();
  await Promise.all(cacheNames.filter(isLegacyPwaCache).map((cacheName) => window.caches.delete(cacheName)));
};

/**
 * Clears browser-side app caches and forces a network reload.
 *
 * @returns Promise that resolves just before the page reload is requested.
 */
export const clearAppCacheAndReload = async () => {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ("caches" in window) {
    const cacheNames = await window.caches.keys();
    await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
  }

  window.localStorage.clear();
  window.sessionStorage.clear();
  window.location.reload();
};
