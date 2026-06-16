import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearCache } from "./cache.mjs";
import { getLiveCompetitionData } from "./football-data.mjs";

const jsonResponse = (body) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("football-data.org normalization", () => {
  beforeEach(() => clearCache());

  it("normalizes matches, standings, and scorers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        if (String(url).includes("/matches")) {
          return jsonResponse({
            matches: [
              {
                id: 42,
                utcDate: "2026-06-15T19:00:00Z",
                status: "IN_PLAY",
                stage: "GROUP_STAGE",
                group: "GROUP_A",
                lastUpdated: "2026-06-15T19:30:00Z",
                area: { name: "World" },
                homeTeam: { id: 1, name: "Alpha", shortName: "Alpha", tla: "ALP", crest: "https://example.com/a.svg" },
                awayTeam: { id: 2, name: "Beta", shortName: "Beta", tla: "BET", crest: "https://example.com/b.svg" },
                score: { fullTime: { home: 1, away: 0 }, penalties: { home: null, away: null } },
                referees: [{ name: "Alex Referee" }],
              },
            ],
          });
        }
        if (String(url).includes("/standings")) {
          return jsonResponse({
            standings: [
              {
                type: "TOTAL",
                group: "GROUP_A",
                table: [
                  {
                    position: 1,
                    team: { id: 1, name: "Alpha", shortName: "Alpha", tla: "ALP" },
                    playedGames: 1,
                    won: 1,
                    draw: 0,
                    lost: 0,
                    goalsFor: 1,
                    goalsAgainst: 0,
                    points: 3,
                    form: "W",
                  },
                ],
              },
            ],
          });
        }
        return jsonResponse({
          scorers: [
            {
              player: { id: 8, name: "A. Striker" },
              team: { id: 1, name: "Alpha", shortName: "Alpha", tla: "ALP" },
              playedMatches: 1,
              goals: 1,
              assists: 0,
              penalties: 0,
            },
          ],
        });
      }),
    );

    const data = await getLiveCompetitionData("world-cup", "2026", {
      footballDataKey: "test",
      footballDataBaseUrl: "https://example.com/v4",
    });

    expect(data.source).toBe("live");
    expect(data.matches[0]).toMatchObject({
      id: "fd-42",
      status: "LIVE",
      group: "Group A",
      homeScore: 1,
    });
    expect(data.matches[0].home.crest).toBe("https://example.com/a.svg");
    expect(data.standings[0]).toMatchObject({ points: 3, zone: "qualified" });
    expect(data.scorers[0]).toMatchObject({ name: "A. Striker", goals: 1 });
  });
});
