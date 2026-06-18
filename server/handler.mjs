import { getLiveMatchDetails } from "./api-football.mjs";
import { jsonError, ProviderError } from "./errors.mjs";
import {
  createFantasyParticipant,
  createFantasyGroup,
  createFantasySignup,
  createFantasyUserPoll,
  changeFantasyParticipantPassword,
  getFantasyGame,
  importFantasySquads,
  joinFantasyGame,
  listFantasyAiSettings,
  listFantasyFixtures,
  listFantasyGroups,
  listFantasyParticipants,
  listFantasyQuestionTemplates,
  listFantasySquads,
  loginFantasyParticipant,
  publishFantasyScores,
  resetAndGenerateFantasyPolls,
  saveFantasyQuestionDrafts,
  saveFantasyResult,
  seedFantasyWorldCupSquads,
  syncFantasyFixturesFromProvider,
  generateFantasyPolls,
  submitFantasyPrediction,
  submitFantasyPredictions,
  updateFantasyAiSettings,
  updateFantasyFixture,
  updateFantasyGroup,
  updateFantasyParticipantCredentials,
  updateFantasyParticipant,
  updateFantasyParticipantRole,
  updateFantasyQuestionTemplate,
  updateFantasySquadPlayer,
  updateFantasyTeam,
  updateFantasyTournament,
} from "./fantasy-game.mjs";
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
 * Parses the optional JSON request body used by local fantasy write APIs.
 *
 * @param body - Raw request body.
 * @returns Parsed JSON object, or an empty object when no body is present.
 */
const parseJsonBody = (body) => {
  if (!body) return {};
  try {
    return JSON.parse(String(body));
  } catch {
    throw new ProviderError("Request body must be valid JSON.", 400, "INVALID_JSON");
  }
};

/**
 * Routes same-origin `/api/*` requests to provider-backed handlers.
 *
 * @param request - Request metadata from Node, Vite middleware, or a Lambda adapter.
 * @param request.method - HTTP method.
 * @param request.url - Request URL including path and query string.
 * @param request.body - Optional raw JSON request body for write routes.
 * @param request.env - Environment-like object containing provider keys and base URLs.
 * @returns Normalized JSON response descriptor.
 */
export const handleApiRequest = async ({
  method = "GET",
  url,
  body,
  env: sourceEnv,
}) => {
  const requestMethod = method.toUpperCase();
  const parsed = new URL(url, "http://localhost");
  const path = parsed.pathname.replace(/\/+$/, "") || "/";
  const env = providerEnv(sourceEnv);

  try {
    if (requestMethod === "GET" && path === "/api/health") {
      return response(200, {
        ok: true,
        providers: {
          footballData: Boolean(env.footballDataKey),
          apiFootball: Boolean(env.apiFootballKey),
        },
      });
    }

    if (requestMethod === "GET" && path === "/api/fantasy/game") {
      return response(200, await getFantasyGame(parsed.searchParams.get("participantId") ?? undefined), {
        "cache-control": "private, max-age=5, stale-while-revalidate=30",
      });
    }

    if (requestMethod === "POST" && path === "/api/fantasy/join") {
      return response(200, await joinFantasyGame(parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    if (requestMethod === "POST" && path === "/api/fantasy/login") {
      return response(200, await loginFantasyParticipant(parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    if (requestMethod === "POST" && path === "/api/fantasy/participants") {
      return response(200, await createFantasySignup(parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    const participantMatch = path.match(/^\/api\/fantasy\/participants\/([^/]+)$/);
    if (requestMethod === "PUT" && participantMatch) {
      return response(200, await updateFantasyParticipant(decodeURIComponent(participantMatch[1]), parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    const participantPasswordMatch = path.match(/^\/api\/fantasy\/participants\/([^/]+)\/password$/);
    if (requestMethod === "PUT" && participantPasswordMatch) {
      return response(200, await changeFantasyParticipantPassword(decodeURIComponent(participantPasswordMatch[1]), parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    if (requestMethod === "GET" && path === "/api/fantasy/admin/participants") {
      return response(200, await listFantasyParticipants(), {
        "cache-control": "private, max-age=5, stale-while-revalidate=30",
      });
    }

    if (requestMethod === "POST" && path === "/api/fantasy/admin/participants") {
      return response(200, await createFantasyParticipant(parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    if (requestMethod === "GET" && path === "/api/fantasy/admin/groups") {
      return response(200, await listFantasyGroups(), {
        "cache-control": "private, max-age=5, stale-while-revalidate=30",
      });
    }

    if (requestMethod === "POST" && path === "/api/fantasy/admin/groups") {
      return response(200, await createFantasyGroup(parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    const groupMatch = path.match(/^\/api\/fantasy\/admin\/groups\/([^/]+)$/);
    if (requestMethod === "PUT" && groupMatch) {
      return response(200, await updateFantasyGroup(decodeURIComponent(groupMatch[1]), parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    const participantRoleMatch = path.match(/^\/api\/fantasy\/admin\/participants\/([^/]+)\/role$/);
    if (requestMethod === "PUT" && participantRoleMatch) {
      return response(200, await updateFantasyParticipantRole(decodeURIComponent(participantRoleMatch[1]), parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    const participantCredentialsMatch = path.match(/^\/api\/fantasy\/admin\/participants\/([^/]+)\/credentials$/);
    if (requestMethod === "PUT" && participantCredentialsMatch) {
      return response(200, await updateFantasyParticipantCredentials(decodeURIComponent(participantCredentialsMatch[1]), parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    if (requestMethod === "POST" && path === "/api/fantasy/admin/tournament") {
      return response(200, await updateFantasyTournament(parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    if (requestMethod === "GET" && path === "/api/fantasy/admin/ai-settings") {
      return response(200, await listFantasyAiSettings(), {
        "cache-control": "private, max-age=5, stale-while-revalidate=30",
      });
    }

    if (requestMethod === "PUT" && path === "/api/fantasy/admin/ai-settings") {
      return response(200, await updateFantasyAiSettings(parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    if (requestMethod === "GET" && path === "/api/fantasy/admin/question-templates") {
      return response(200, await listFantasyQuestionTemplates(), {
        "cache-control": "private, max-age=5, stale-while-revalidate=30",
      });
    }

    const questionTemplateMatch = path.match(/^\/api\/fantasy\/admin\/question-templates\/([^/]+)$/);
    if (requestMethod === "PUT" && questionTemplateMatch) {
      return response(200, await updateFantasyQuestionTemplate(decodeURIComponent(questionTemplateMatch[1]), parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    if (requestMethod === "GET" && path === "/api/fantasy/admin/squads") {
      return response(200, await listFantasySquads(), {
        "cache-control": "private, max-age=5, stale-while-revalidate=30",
      });
    }

    if (requestMethod === "POST" && path === "/api/fantasy/admin/squads/import") {
      return response(200, await importFantasySquads(parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    if (requestMethod === "POST" && path === "/api/fantasy/admin/squads/seed-world-cup-2026") {
      return response(200, await seedFantasyWorldCupSquads(parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    const teamMatch = path.match(/^\/api\/fantasy\/admin\/teams\/([^/]+)$/);
    if (requestMethod === "PUT" && teamMatch) {
      return response(200, await updateFantasyTeam(decodeURIComponent(teamMatch[1]), parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    const squadPlayerMatch = path.match(/^\/api\/fantasy\/admin\/squad-players\/([^/]+)$/);
    if (requestMethod === "PUT" && squadPlayerMatch) {
      return response(200, await updateFantasySquadPlayer(decodeURIComponent(squadPlayerMatch[1]), parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    if (requestMethod === "GET" && path === "/api/fantasy/admin/fixtures") {
      return response(200, await listFantasyFixtures(), {
        "cache-control": "private, max-age=5, stale-while-revalidate=30",
      });
    }

    if (requestMethod === "POST" && path === "/api/fantasy/admin/fixtures/sync-live") {
      return response(200, await syncFantasyFixturesFromProvider(env, parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    const fixtureMatch = path.match(/^\/api\/fantasy\/admin\/fixtures\/([^/]+)$/);
    if (requestMethod === "PUT" && fixtureMatch) {
      return response(200, await updateFantasyFixture(decodeURIComponent(fixtureMatch[1]), parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    const questionDraftMatch = path.match(/^\/api\/fantasy\/admin\/questions\/([^/]+)\/drafts$/);
    if (requestMethod === "POST" && questionDraftMatch) {
      return response(200, await saveFantasyQuestionDrafts(decodeURIComponent(questionDraftMatch[1]), parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    if (requestMethod === "POST" && path === "/api/fantasy/admin/polls/generate") {
      return response(200, await generateFantasyPolls(parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    if (requestMethod === "POST" && path === "/api/fantasy/admin/polls/reset") {
      return response(200, await resetAndGenerateFantasyPolls(parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    if (requestMethod === "POST" && path === "/api/fantasy/polls") {
      return response(200, await createFantasyUserPoll(parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    if (requestMethod === "PUT" && path === "/api/fantasy/predictions") {
      return response(200, await submitFantasyPredictions(parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    const predictionMatch = path.match(/^\/api\/fantasy\/predictions\/([^/]+)$/);
    if (requestMethod === "PUT" && predictionMatch) {
      const payload = parseJsonBody(body);
      return response(200, await submitFantasyPrediction({
        questionId: decodeURIComponent(predictionMatch[1]),
        participantId: payload.participantId,
        answer: payload.answer,
      }), {
        "cache-control": "no-store",
      });
    }

    const resultMatch = path.match(/^\/api\/fantasy\/admin\/results\/([^/]+)$/);
    if (requestMethod === "POST" && resultMatch) {
      return response(200, await saveFantasyResult(decodeURIComponent(resultMatch[1]), parseJsonBody(body)), {
        "cache-control": "no-store",
      });
    }

    const scorePublishMatch = path.match(/^\/api\/fantasy\/admin\/results\/([^/]+)\/publish-scores$/);
    if (requestMethod === "POST" && scorePublishMatch) {
      return response(200, await publishFantasyScores(decodeURIComponent(scorePublishMatch[1])), {
        "cache-control": "no-store",
      });
    }

    if (requestMethod !== "GET") {
      return response(405, {
        error: { code: "METHOD_NOT_ALLOWED", message: "Unsupported API method for this route." },
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
