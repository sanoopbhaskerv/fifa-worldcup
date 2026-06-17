import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearCache } from "./cache.mjs";
import { getLiveMatchDetails } from "./api-football.mjs";

const jsonResponse = (response) =>
  new Response(
    JSON.stringify({ get: "fixtures", parameters: {}, errors: [], results: response.length, response }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

describe("API-Football detail normalization", () => {
  beforeEach(() => clearCache());

  it("resolves a fixture and normalizes events, lineups, and statistics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        const value = String(url);
        if (value.includes("/fixtures?date=")) {
          return jsonResponse([
            {
              fixture: { id: 99, referee: "Alex Referee", status: { short: "FT" } },
              league: { id: 1 },
              teams: { home: { name: "Alpha" }, away: { name: "Beta" } },
            },
          ]);
        }
        if (value.includes("/events")) {
          return jsonResponse([
            {
              time: { elapsed: 12, extra: null },
              team: { id: 1, name: "Alpha" },
              player: { id: 7, name: "A. Striker" },
              assist: { id: 8, name: "A. Creator" },
              type: "Goal",
              detail: "Normal Goal",
            },
          ]);
        }
        if (value.includes("/lineups")) {
          return jsonResponse([
            {
              team: { id: 1, name: "Alpha" },
              formation: "4-3-3",
              coach: { name: "A. Coach" },
              startXI: [{ player: { id: 7, name: "A. Striker", number: 9, pos: "F" } }],
              substitutes: [],
            },
          ]);
        }
        return jsonResponse([
          {
            team: { id: 1, name: "Alpha" },
            statistics: [
              { type: "Ball Possession", value: "55%" },
              { type: "Total Shots", value: 12 },
            ],
          },
          {
            team: { id: 2, name: "Beta" },
            statistics: [
              { type: "Ball Possession", value: "45%" },
              { type: "Total Shots", value: 7 },
            ],
          },
        ]);
      }),
    );

    const details = await getLiveMatchDetails(
      {
        competitionId: "world-cup",
        kickoff: "2026-06-15T19:00:00Z",
        home: "Alpha",
        away: "Beta",
      },
      {
        apiFootballKey: "test",
        apiFootballBaseUrl: "https://example.com",
        apiFootballDailyBudget: "90",
      },
    );

    expect(details.fixtureId).toBe("99");
    expect(details.events[0]).toMatchObject({
      type: "goal",
      player: "A. Striker",
      assist: "A. Creator",
    });
    expect(details.lineups[0]).toMatchObject({
      formation: "4-3-3",
      coach: "A. Coach",
    });
    expect(details.statistics).toHaveLength(2);
    expect(details.officials).toEqual(["Alex Referee"]);
  });
});
