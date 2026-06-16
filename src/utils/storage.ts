const KEYS = {
  favorites: "full-time:favorites:v1",
  recents: "full-time:recents:v1",
  selection: "full-time:last-selection:v1",
} as const;

export interface StoredSelection {
  competitionSlug: string;
  editionId: string;
}

const read = <T>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in privacy modes.
  }
};

export const storage = {
  getFavorites: () => read<string[]>(KEYS.favorites, []),
  setFavorites: (value: string[]) => write(KEYS.favorites, value),
  getRecents: () => read<string[]>(KEYS.recents, []),
  addRecent: (id: string) => {
    const value = [id, ...read<string[]>(KEYS.recents, []).filter((item) => item !== id)].slice(0, 5);
    write(KEYS.recents, value);
    return value;
  },
  getSelection: () => read<StoredSelection | null>(KEYS.selection, null),
  setSelection: (value: StoredSelection) => write(KEYS.selection, value),
};
