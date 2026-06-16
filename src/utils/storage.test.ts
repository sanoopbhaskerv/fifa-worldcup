import { describe, expect, it } from "vitest";
import { storage } from "./storage";

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
});
