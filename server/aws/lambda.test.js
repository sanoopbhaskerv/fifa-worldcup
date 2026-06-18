import { beforeEach, describe, expect, it } from "vitest";
import { resetFantasyGame } from "../fantasy-game.mjs";
import { handler } from "./lambda.mjs";

describe("fantasy Lambda adapter", () => {
  beforeEach(async () => {
    delete process.env.EMIT_LAMBDA_CORS_HEADERS;
    delete process.env.CORS_ALLOW_ORIGIN;
    await resetFantasyGame();
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
});
