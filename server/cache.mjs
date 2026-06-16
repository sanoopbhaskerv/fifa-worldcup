const entries = new Map();

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

export const clearCache = () => entries.clear();
