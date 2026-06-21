import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCache } from "../cache.mjs";
import { resetFantasyGame } from "../fantasy-game.mjs";
import { handler } from "./lambda.mjs";

describe("fantasy Lambda adapter", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-17T12:00:00+05:30"));
    delete process.env.EMIT_LAMBDA_CORS_HEADERS;
    delete process.env.CORS_ALLOW_ORIGIN;
    delete process.env.FOOTBALL_DATA_API_KEY;
    delete process.env.FOOTBALL_DATA_BASE_URL;
    clearCache();
    await resetFantasyGame();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("handles CORS preflight without touching the API router", async () => {
    const response = await handler({
      requestContext: { http: { method: "OPTIONS" } },
      rawPath: "/api/fantasy/game",
    });

    expect(response).toMatchObject({
      statusCode: 204,
      headers: {
        "access-control-allow-methods": "GET,PUT,POST,OPTIONS",
      },
      body: "",
    });
  });

  it("routes Function URL events to the fantasy API", async () => {
    const response = await handler({
      requestContext: { http: { method: "PUT" } },
      rawPath: "/api/fantasy/predictions/q-bra-arg-winner",
      body: JSON.stringify({ answer: "Argentina" }),
    });
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    expect(body.prediction).toMatchObject({
      questionId: "q-bra-arg-winner",
      participantId: "p-sanoop",
      answer: "Argentina",
    });
  });

  it("can emit CORS headers for non-Function URL deployments when explicitly enabled", async () => {
    process.env.EMIT_LAMBDA_CORS_HEADERS = "true";

    const response = await handler({
      requestContext: { http: { method: "GET" } },
      rawPath: "/api/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("*");
  });

  it("routes EventBridge schedule events to AI draft generation", async () => {
    const response = await handler({
      source: "aws.events",
    });
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      autoPublish: false,
    });
    expect(Array.isArray(body.generated)).toBe(true);
  });

  it("routes EventBridge match automation events to fixture and result sync", async () => {
    process.env.FOOTBALL_DATA_API_KEY = "test-key";
    process.env.FOOTBALL_DATA_BASE_URL = "https://fd.test/v4";
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      const href = String(url);
      if (href.includes("/matches?season=2026")) {
        return new Response(JSON.stringify({
          matches: [
            {
              id: 100,
              utcDate: "2026-06-20T18:00:00Z",
              status: "FINISHED",
              stage: "GROUP_STAGE",
              group: "GROUP_D",
              matchday: 1,
              homeTeam: { id: 1, name: "Brazil", shortName: "Brazil", tla: "BRA" },
              awayTeam: { id: 2, name: "Argentina", shortName: "Argentina", tla: "ARG" },
              score: { fullTime: { home: 1, away: 2 } },
            },
          ],
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (href.includes("/standings?season=2026")) {
        return new Response(JSON.stringify({ standings: [] }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (href.includes("/scorers?season=2026")) {
        return new Response(JSON.stringify({ scorers: [] }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({}), { status: 404, headers: { "content-type": "application/json" } });
    }));

    const response = await handler({
      source: "aws.events",
      detail: { task: "match-automation" },
    });
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      fixtures: { synced: 1 },
      results: { synced: 1, skipped: 0 },
      published: [expect.objectContaining({ matchId: "fd-100" })],
    });
  });
});
