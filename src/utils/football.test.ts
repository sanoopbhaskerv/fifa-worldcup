import { describe, expect, it } from "vitest";
import { competitionCatalog } from "../mocks/catalog";
import { buildCompetitionData } from "../mocks/data";
import { availableSections, filterMatches, matchWinnerId, resolveLiveMinute, sectionPath } from "./football";

describe("football utilities", () => {
  const worldCup = competitionCatalog.find((item) => item.id === "world-cup")!;
  const premierLeague = competitionCatalog.find((item) => item.id === "premier-league")!;
  const data = buildCompetitionData(worldCup, "2026");

  it("derives navigation from capabilities", () => {
    expect(availableSections(worldCup)).toContain("bracket");
    expect(availableSections(premierLeague)).not.toContain("bracket");
  });

  it("builds canonical edition routes", () => {
    expect(sectionPath(worldCup, "2026", "fixtures")).toBe("/competitions/world-cup/2026/fixtures");
    expect(sectionPath(worldCup, "2026", "overview")).toBe("/competitions/world-cup/2026");
  });

  it("filters by status, team, and stage", () => {
    expect(filterMatches(data.matches, "LIVE", "", "ALL").length).toBeGreaterThan(0);
    expect(filterMatches(data.matches, "ALL", "Argentina", "ALL").length).toBeGreaterThan(0);
    expect(filterMatches(data.matches, "ALL", "", "Quarter-finals").every((match) => match.stage === "Quarter-finals")).toBe(true);
  });

  it("uses penalties to resolve a drawn tie", () => {
    expect(matchWinnerId(1, 1, "home", "away", 4, 3)).toBe("home");
  });

  it("prefers provider minute for live labels", () => {
    expect(resolveLiveMinute(67, "2026-06-15T19:00:00Z", Date.parse("2026-06-15T20:30:00Z"))).toBe(67);
  });

  it("derives live minute from kickoff when provider minute is missing", () => {
    expect(resolveLiveMinute(undefined, "2026-06-15T19:00:00Z", Date.parse("2026-06-15T19:45:00Z"))).toBe(45);
  });
});
