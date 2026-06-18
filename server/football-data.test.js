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
                matchday: 1,
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
      matchday: 1,
      matchNumber: "1",
    });
    expect(data.matches[0].home.crest).toBe("https://example.com/a.svg");
    expect(data.standings[0]).toMatchObject({ points: 3, zone: "qualified" });
    expect(data.scorers[0]).toMatchObject({ name: "A. Striker", goals: 1 });
  });

  it("fills live minute from match detail endpoint when list payload omits it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        if (String(url).includes("/matches/42")) {
          return jsonResponse({
            match: {
              id: 42,
              minute: 63,
            },
          });
        }
        if (String(url).includes("/matches")) {
          return jsonResponse({
            matches: [
              {
                id: 42,
                utcDate: "2026-06-15T19:00:00Z",
                status: "IN_PLAY",
                matchday: 1,
                stage: "GROUP_STAGE",
                group: "GROUP_A",
                lastUpdated: "2026-06-15T19:30:00Z",
                area: { name: "World" },
                homeTeam: { id: 1, name: "Alpha", shortName: "Alpha", tla: "ALP" },
                awayTeam: { id: 2, name: "Beta", shortName: "Beta", tla: "BET" },
                score: { fullTime: { home: 1, away: 0 }, penalties: { home: null, away: null } },
                referees: [{ name: "Alex Referee" }],
              },
            ],
          });
        }
        if (String(url).includes("/standings")) {
          return jsonResponse({ standings: [] });
        }
        return jsonResponse({ scorers: [] });
      }),
    );

    const data = await getLiveCompetitionData("world-cup", "2026", {
      footballDataKey: "test",
      footballDataBaseUrl: "https://example.com/v4",
    });

    expect(data.matches[0].minute).toBe(63);
  });

  it("overlays API-Football live phase, score, and stoppage time", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        const value = String(url);
        if (value.includes("/fixtures?live=all")) {
          return new Response(
            JSON.stringify({
              errors: [],
              response: [
                {
                  fixture: {
                    id: 99,
                    date: "2026-06-15T19:00:00Z",
                    status: { short: "2H", elapsed: 90, extra: 3 },
                  },
                  league: { id: 1, season: 2026 },
                  teams: { home: { name: "Alpha" }, away: { name: "Beta" } },
                  goals: { home: 2, away: 1 },
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (value.includes("/matches")) {
          return jsonResponse({
            matches: [
              {
                id: 42,
                utcDate: "2026-06-15T19:00:00Z",
                status: "TIMED",
                matchday: 1,
                stage: "GROUP_STAGE",
                group: "GROUP_A",
                area: { name: "World" },
                homeTeam: { id: 1, name: "Alpha", shortName: "Alpha", tla: "ALP" },
                awayTeam: { id: 2, name: "Beta", shortName: "Beta", tla: "BET" },
                score: { fullTime: { home: null, away: null } },
                referees: [],
              },
            ],
          });
        }
        if (value.includes("/standings")) {
          return jsonResponse({ standings: [] });
        }
        return jsonResponse({ scorers: [] });
      }),
    );

    const data = await getLiveCompetitionData("world-cup", "2026", {
      footballDataKey: "test",
      apiFootballKey: "detail-test",
      footballDataBaseUrl: "https://example.com/v4",
      apiFootballBaseUrl: "https://example.com/api-football",
      apiFootballDailyBudget: "90",
    });

    expect(data.matches[0]).toMatchObject({
      status: "LIVE",
      minute: 90,
      extraMinute: 3,
      livePhase: "2H",
      homeScore: 2,
      awayScore: 1,
      externalIds: { apiFootball: "99" },
    });
  });

  it("treats terminal API-Football live phases as completed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        const value = String(url);
        if (value.includes("/fixtures?live=all")) {
          return new Response(
            JSON.stringify({
              errors: [],
              response: [
                {
                  fixture: {
                    id: 99,
                    date: "2026-06-15T19:00:00Z",
                    status: { short: "FT", elapsed: 90, extra: null },
                  },
                  league: { id: 1, season: 2026 },
                  teams: { home: { name: "Alpha" }, away: { name: "Beta" } },
                  goals: { home: 2, away: 1 },
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (value.includes("/matches")) {
          return jsonResponse({
            matches: [
              {
                id: 42,
                utcDate: "2026-06-15T19:00:00Z",
                status: "LIVE",
                matchday: 1,
                stage: "GROUP_STAGE",
                group: "GROUP_A",
                homeTeam: { id: 1, name: "Alpha", shortName: "Alpha", tla: "ALP" },
                awayTeam: { id: 2, name: "Beta", shortName: "Beta", tla: "BET" },
                score: { fullTime: { home: null, away: null } },
                referees: [],
              },
            ],
          });
        }
        if (value.includes("/standings")) return jsonResponse({ standings: [] });
        return jsonResponse({ scorers: [] });
      }),
    );

    const data = await getLiveCompetitionData("world-cup", "2026", {
      footballDataKey: "test",
      apiFootballKey: "detail-test",
      footballDataBaseUrl: "https://example.com/v4",
      apiFootballBaseUrl: "https://example.com/api-football",
      apiFootballDailyBudget: "90",
    });

    expect(data.matches[0]).toMatchObject({
      status: "COMPLETED",
      livePhase: "FT",
      homeScore: 2,
      awayScore: 1,
    });
  });


  it("derives group standings from match team ids when standings are flattened", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        if (String(url).includes("/matches")) {
          return jsonResponse({
            matches: [
              {
                id: 101,
                utcDate: "2026-06-11T19:00:00Z",
                status: "FINISHED",
                matchday: 1,
                stage: "GROUP_STAGE",
                group: "GROUP_A",
                homeTeam: { id: 769, name: "Mexico", shortName: "Mexico", tla: "MEX" },
                awayTeam: { id: 774, name: "South Africa", shortName: "South Africa", tla: "RSA" },
                score: { fullTime: { home: 2, away: 0 } },
                referees: [],
              },
              {
                id: 102,
                utcDate: "2026-06-12T19:00:00Z",
                status: "FINISHED",
                matchday: 1,
                stage: "GROUP_STAGE",
                group: "GROUP_B",
                homeTeam: { id: 759, name: "Germany", shortName: "Germany", tla: "GER" },
                awayTeam: { id: 760, name: "Japan", shortName: "Japan", tla: "JPN" },
                score: { fullTime: { home: 7, away: 1 } },
                referees: [],
              },
            ],
          });
        }
        if (String(url).includes("/standings")) {
          return jsonResponse({
            standings: [
              {
                type: "TOTAL",
                table: [
                  {
                    position: 1,
                    team: { id: 759, name: "Germany", shortName: "Germany", tla: "GER" },
                    playedGames: 1,
                    won: 1,
                    draw: 0,
                    lost: 0,
                    goalsFor: 7,
                    goalsAgainst: 1,
                    points: 3,
                    form: "W",
                  },
                  {
                    position: 2,
                    team: { id: 769, name: "Mexico", shortName: "Mexico", tla: "MEX" },
                    playedGames: 1,
                    won: 1,
                    draw: 0,
                    lost: 0,
                    goalsFor: 2,
                    goalsAgainst: 0,
                    points: 3,
                    form: "W",
                  },
                  {
                    position: 3,
                    team: { id: 774, name: "South Africa", shortName: "South Africa", tla: "RSA" },
                    playedGames: 1,
                    won: 0,
                    draw: 0,
                    lost: 1,
                    goalsFor: 0,
                    goalsAgainst: 2,
                    points: 0,
                    form: "L",
                  },
                  {
                    position: 4,
                    team: { id: 760, name: "Japan", shortName: "Japan", tla: "JPN" },
                    playedGames: 1,
                    won: 0,
                    draw: 0,
                    lost: 1,
                    goalsFor: 1,
                    goalsAgainst: 7,
                    points: 0,
                    form: "L",
                  },
                ],
              },
            ],
          });
        }
        return jsonResponse({ scorers: [] });
      }),
    );

    const data = await getLiveCompetitionData("world-cup", "2026", {
      footballDataKey: "test",
      footballDataBaseUrl: "https://example.com/v4",
    });

    expect(
      data.standings.map((standing) => [
        standing.group,
        standing.position,
        standing.team.code,
      ]),
    ).toEqual([
      ["Group A", 1, "MEX"],
      ["Group A", 2, "RSA"],
      ["Group B", 1, "GER"],
      ["Group B", 2, "JPN"],
    ]);
    expect(data.standings.find((standing) => standing.team.code === "GER")).toMatchObject({
      position: 1,
      group: "Group B",
      zone: "qualified",
    });
    expect(data.standings.find((standing) => standing.team.code === "JPN")).toMatchObject({
      position: 2,
      group: "Group B",
      zone: "qualified",
    });
  });
});
