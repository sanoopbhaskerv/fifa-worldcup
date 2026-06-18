import { describe, expect, it } from "vitest";
import { defaultTheme, lightModeTheme, resolveSystemTheme, resolveTheme } from "./theme";

describe("theme resolver", () => {
  it("returns supported values", () => {
    expect(resolveTheme("pitch")).toBe("pitch");
    expect(resolveTheme("ocean")).toBe("ocean");
  });

  it("falls back to default for unknown values", () => {
    expect(resolveTheme("something-else")).toBe(defaultTheme);
    expect(resolveTheme(undefined)).toBe(defaultTheme);
    expect(resolveTheme(null)).toBe(defaultTheme);
  });

  it("maps system light preference to a warmer fallback theme", () => {
    expect(resolveSystemTheme(() => ({ matches: true }))).toBe(lightModeTheme);
    expect(resolveSystemTheme(() => ({ matches: false }))).toBe(defaultTheme);
  });

  it("safely falls back when matchMedia is unavailable", () => {
    expect(resolveSystemTheme(undefined)).toBe(defaultTheme);
  });
});
