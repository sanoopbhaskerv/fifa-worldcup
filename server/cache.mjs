const entries = new Map();

/**
 * Caches async loader results by key until their TTL expires.
 *
 * @param key - Cache key for the resource.
 * @param ttlMs - Time to keep a successful value in memory.
 * @param loader - Async function that loads the value on cache miss.
 * @returns Cached or newly loaded value.
 */
export const cached = async (key, ttlMs, loader) => {
  const now = Date.now();
  const existing = entries.get(key);
  if (existing?.value !== undefined && existing.expiresAt > now) {
    return existing.value;
  }
  if (existing?.pending) return existing.pending;

  const pending = loader()
    .then((value) => {
      entries.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .catch((error) => {
      entries.delete(key);
      throw error;
    });

  entries.set(key, { pending, expiresAt: now + ttlMs });
  return pending;
};

/**
 * Clears all process-memory cache entries, primarily for tests.
 *
 * @returns Nothing; empties the in-memory cache map.
 */
export const clearCache = () => entries.clear();
