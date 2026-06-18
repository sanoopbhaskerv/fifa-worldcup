import { describe, expect, it } from "vitest";
import { storage } from "./storage";
import { defaultTheme } from "./theme";

describe("storage", () => {
  it("persists favorites and selections", () => {
    storage.setFavorites(["world-cup"]);
    storage.setSelection({ competitionSlug: "world-cup", editionId: "2026" });
    expect(storage.getFavorites()).toEqual(["world-cup"]);
    expect(storage.getSelection()).toEqual({ competitionSlug: "world-cup", editionId: "2026" });
  });

  it("deduplicates and caps recents", () => {
    ["a", "b", "c", "d", "e", "f", "c"].forEach(storage.addRecent);
    expect(storage.getRecents()).toEqual(["c", "f", "e", "d", "b"]);
  });

  it("persists and clears fantasy identity", () => {
    storage.setFantasyIdentity({ participantId: "p-anoop", nickname: "Messi Monk" });
    expect(storage.getFantasyIdentity()).toEqual({ participantId: "p-anoop", nickname: "Messi Monk" });

    storage.clearFantasyIdentity();

    expect(storage.getFantasyIdentity()).toBeNull();
  });

  it("persists theme and falls back for invalid values", () => {
    storage.setTheme("neon");
    expect(storage.getTheme()).toBe("neon");
    expect(storage.getStoredTheme()).toBe("neon");

    localStorage.setItem("full-time:theme:v1", JSON.stringify("unknown-theme"));
    expect(storage.getTheme()).toBe(defaultTheme);
    expect(storage.getStoredTheme()).toBe(defaultTheme);
  });

  it("returns null when no explicit theme has been stored", () => {
    localStorage.removeItem("full-time:theme:v1");
    expect(storage.getStoredTheme()).toBeNull();
  });
});
