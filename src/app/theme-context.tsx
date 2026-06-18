import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { storage } from "../utils/storage";
import { resolveSystemTheme, resolveTheme, themeOptions, type ThemeId } from "../utils/theme";

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  options: typeof themeOptions;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Provides global token-theme state and persistence for the app.
 *
 * @param props - Provider props.
 * @param props.children - Nested app tree.
 * @returns Theme context provider.
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => storage.getStoredTheme() ?? resolveSystemTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    storage.setTheme(theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme: (nextTheme) => setThemeState(resolveTheme(nextTheme)),
    options: themeOptions,
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Reads the global theme context.
 *
 * @returns Theme context value.
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
