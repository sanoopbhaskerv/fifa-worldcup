import { afterEach, describe, expect, it, vi } from "vitest";

describe("API football provider backend base URL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses the Lambda backend URL when configured", async () => {
    vi.stubEnv("VITE_FANTASY_API_BASE_URL", "https://lambda.example/");
    vi.resetModules();

    const { backendApiBaseUrl } = await import("./api-football-provider");

    expect(backendApiBaseUrl).toBe("https://lambda.example");
  });

  it("prefers the generic backend API URL over the fantasy alias", async () => {
    vi.stubEnv("VITE_BACKEND_API_BASE_URL", "https://api.example/");
    vi.stubEnv("VITE_FANTASY_API_BASE_URL", "https://lambda.example/");
    vi.resetModules();

    const { backendApiBaseUrl } = await import("./api-football-provider");

    expect(backendApiBaseUrl).toBe("https://api.example");
  });
});
