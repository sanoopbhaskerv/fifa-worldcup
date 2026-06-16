import { getLiveMatchDetails } from "./api-football.mjs";
import { jsonError, ProviderError } from "./errors.mjs";
import { getLiveCompetitionData } from "./football-data.mjs";
import { providerEnv } from "./env.mjs";

/**
 * Builds a JSON API response descriptor shared by Node and Lambda-style callers.
 *
 * @param status - HTTP status code.
 * @param body - JSON-serializable response body.
 * @param extraHeaders - Additional headers to merge into the default JSON headers.
 * @returns Normalized response descriptor.
 */
const response = (status, body, extraHeaders = {}) => ({
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control":
      status === 200 ? "private, max-age=30, stale-while-revalidate=300" : "no-store",
    ...extraHeaders,
  },
  body,
});

/**
 * Routes same-origin `/api/*` requests to provider-backed handlers.
 *
 * @param request - Request metadata from Node, Vite middleware, or a Lambda adapter.
 * @param request.method - HTTP method; only `GET` is supported.
 * @param request.url - Request URL including path and query string.
 * @param request.env - Environment-like object containing provider keys and base URLs.
 * @returns Normalized JSON response descriptor.
 */
export const handleApiRequest = async ({
  method = "GET",
  url,
  env: sourceEnv,
}) => {
  if (method !== "GET") {
    return response(405, {
      error: { code: "METHOD_NOT_ALLOWED", message: "Only GET is supported." },
    });
  }

  const parsed = new URL(url, "http://localhost");
  const path = parsed.pathname.replace(/\/+$/, "") || "/";
  const env = providerEnv(sourceEnv);

  try {
    if (path === "/api/health") {
      return response(200, {
        ok: true,
        providers: {
          footballData: Boolean(env.footballDataKey),
          apiFootball: Boolean(env.apiFootballKey),
        },
      });
    }

    const competitionMatch = path.match(
      /^\/api\/competitions\/([^/]+)\/([^/]+)$/,
    );
    if (competitionMatch) {
      const [, competitionId, editionId] = competitionMatch;
      const data = await getLiveCompetitionData(
        decodeURIComponent(competitionId),
        decodeURIComponent(editionId),
        env,
      );
      return response(200, data);
    }

    const detailMatch = path.match(/^\/api\/matches\/([^/]+)\/details$/);
    if (detailMatch) {
      const data = await getLiveMatchDetails(
        {
          matchId: decodeURIComponent(detailMatch[1]),
          competitionId: parsed.searchParams.get("competitionId") ?? "",
          kickoff: parsed.searchParams.get("kickoff") ?? "",
          home: parsed.searchParams.get("home") ?? "",
          away: parsed.searchParams.get("away") ?? "",
        },
        env,
      );
      return response(200, data);
    }

    throw new ProviderError("API route not found.", 404, "NOT_FOUND");
  } catch (error) {
    const normalized = jsonError(error);
    return response(normalized.status, normalized.body);
  }
};

/**
 * Writes a normalized API response descriptor to a Node HTTP response.
 *
 * @param nodeResponse - Node HTTP response object.
 * @param result - Response descriptor from `handleApiRequest`.
 * @returns Nothing; writes headers and serialized JSON body to the response.
 */
export const sendNodeResponse = (nodeResponse, result) => {
  nodeResponse.writeHead(result.status, result.headers);
  nodeResponse.end(JSON.stringify(result.body));
};
