export const themeOptions = [
  { id: "pitch", label: "Pitch Green" },
  { id: "ocean", label: "Ocean Blue" },
  { id: "sunset", label: "Sunset Amber" },
  { id: "neon", label: "Neon Night" },

  { id: "champions", label: "Champions Gold" },
  { id: "derby", label: "Derby Red" },
  { id: "trophy", label: "Trophy Gold" },
  { id: "night-match", label: "Night Match" },
  { id: "brazil", label: "Brazil Yellow" },
  { id: "argentina", label: "Argentina Sky" },
  { id: "royal", label: "Royal Purple" },
  { id: "street", label: "Street Football" },
  { id: "ice", label: "Ice Blue" },
  { id: "volcano", label: "Volcano Orange" },
] as const;

export type ThemeId = (typeof themeOptions)[number]["id"];

export const defaultTheme: ThemeId = "pitch";
export const lightModeTheme: ThemeId = "sunset";

const validThemes = new Set<ThemeId>(themeOptions.map((option) => option.id));

/**
 * Resolves arbitrary persisted input to a known theme id.
 *
 * @param value - Raw stored value.
 * @returns Supported theme id or the default.
 */
export const resolveTheme = (value: string | null | undefined): ThemeId => {
  if (value && validThemes.has(value as ThemeId)) return value as ThemeId;
  return defaultTheme;
};

/**
 * Resolves a theme from system color-scheme preference.
 *
 * @param matchMediaFn - Optional injected matchMedia function for testability.
 * @returns A dark-friendly default, or a warmer light-mode variant.
 */
export const resolveSystemTheme = (
  matchMediaFn: ((query: string) => { matches: boolean }) | undefined = globalThis.matchMedia?.bind(globalThis),
): ThemeId => {
  try {
    if (!matchMediaFn) return defaultTheme;
    return matchMediaFn("(prefers-color-scheme: light)").matches ? lightModeTheme : defaultTheme;
  } catch {
    return defaultTheme;
  }
};
