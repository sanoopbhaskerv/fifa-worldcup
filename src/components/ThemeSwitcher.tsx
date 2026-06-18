import { useTheme } from "../app/theme-context";
import type { ThemeId } from "../utils/theme";

type ThemeSwitcherProps = {
  compact?: boolean;
  className?: string;
};

/**
 * Renders a reusable color-theme selector.
 *
 * @param props - Component props.
 * @param props.compact - Uses compact label treatment for tight headers.
 * @param props.className - Optional className extension.
 * @returns Theme selector field.
 */
export const ThemeSwitcher = ({ compact, className }: ThemeSwitcherProps) => {
  const { theme, setTheme, options } = useTheme();
  return (
    <label className={`theme-switcher ${compact ? "theme-switcher--compact" : ""} ${className ?? ""}`.trim()}>
      <span className="theme-switcher__label">Theme</span>
      <select
        aria-label="Color theme"
        onChange={(event) => setTheme(event.target.value as ThemeId)}
        value={theme}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
};
