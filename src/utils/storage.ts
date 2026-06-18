import { defaultTheme, resolveTheme, type ThemeId } from "./theme";

const KEYS = {
  favorites: "full-time:favorites:v1",
  fantasyIdentity: "full-time:fantasy-identity:v1",
  recents: "full-time:recents:v1",
  selection: "full-time:last-selection:v1",
  theme: "full-time:theme:v1",
} as const;

export interface StoredSelection {
  competitionSlug: string;
  editionId: string;
}

export interface StoredFantasyIdentity {
  participantId: string;
  nickname: string;
  role?: "ADMIN" | "PLAYER";
  email?: string;
  phone?: string;
}

/**
 * Safely reads a JSON value from `localStorage`.
 *
 * @param key - Storage key to read.
 * @param fallback - Value returned when storage is unavailable or malformed.
 * @returns Parsed storage value or the provided fallback.
 */
const read = <T>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

/**
 * Safely writes a JSON value to `localStorage`.
 *
 * @param key - Storage key to write.
 * @param value - JSON-serializable value to persist.
 * @returns Nothing; storage failures are intentionally ignored.
 */
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in privacy modes.
  }
};

/**
 * Versioned persistence facade for user choices and recent navigation.
 *
 * @remarks The methods intentionally hide JSON parsing and storage failures from
 * callers so the app can continue in restricted browser storage modes.
 */
export const storage = {
  getFavorites: () => read<string[]>(KEYS.favorites, []),
  setFavorites: (value: string[]) => write(KEYS.favorites, value),
  clearFantasyIdentity: () => {
    try {
      localStorage.removeItem(KEYS.fantasyIdentity);
    } catch {
      // Storage can be unavailable in privacy modes.
    }
  },
  getFantasyIdentity: () => read<StoredFantasyIdentity | null>(KEYS.fantasyIdentity, null),
  setFantasyIdentity: (value: StoredFantasyIdentity) => write(KEYS.fantasyIdentity, value),
  getRecents: () => read<string[]>(KEYS.recents, []),
  addRecent: (id: string) => {
    const value = [id, ...read<string[]>(KEYS.recents, []).filter((item) => item !== id)].slice(0, 5);
    write(KEYS.recents, value);
    return value;
  },
  getSelection: () => read<StoredSelection | null>(KEYS.selection, null),
  setSelection: (value: StoredSelection) => write(KEYS.selection, value),
  getStoredTheme: () => {
    const value = read<string | null>(KEYS.theme, null);
    return value ? resolveTheme(value) : null;
  },
  getTheme: () => resolveTheme(read<string>(KEYS.theme, defaultTheme)),
  setTheme: (value: ThemeId) => write(KEYS.theme, value),
};
