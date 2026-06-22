import { handleApiRequest } from "../handler.mjs";

// Log which AI env vars are populated on cold start (values never logged).
const logStartupConfig = () => {
  const vars = [
    "FANTASY_AI_PROVIDER",
    "FANTASY_AI_API_KEY",
    "FANTASY_AI_MODEL",
    "FANTASY_AI_DAILY_CALL_LIMIT",
    "FANTASY_AI_FALLBACK_API_KEY",
  ];
  const summary = vars.map((k) => `${k}=${process.env[k] ? "set" : "MISSING"}`).join(" ");
  console.log("[lambda] startup config:", summary);
};

logStartupConfig();

const corsHeaders = () => ({
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET,PUT,POST,OPTIONS",
  "access-control-allow-origin": process.env.CORS_ALLOW_ORIGIN ?? "*",
});

const shouldEmitCorsHeaders = () =>
  process.env.EMIT_LAMBDA_CORS_HEADERS === "true";

const methodFromEvent = (event) =>
  event.requestContext?.http?.method ?? event.httpMethod ?? "GET";

const pathFromEvent = (event) =>
  event.rawPath ?? event.path ?? "/";

const queryFromEvent = (event) => {
  if (event.rawQueryString) return `?${event.rawQueryString}`;
  const params = event.queryStringParameters;
  if (!params) return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : "";
};

const bodyFromEvent = (event) => {
  if (!event.body) return undefined;
  return event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
};

/**
 * Lambda handler for Function URL or API Gateway HTTP API events.
 *
 * @param event - Lambda HTTP event.
 * @returns Lambda proxy response.
 */
export const handler = async (event) => {
  // EventBridge scheduled events arrive in two shapes:
  //   1. Standard envelope: event.source === "aws.events" — no custom Input set on the rule target.
  //   2. Custom Input override: the entire event is replaced by the Input JSON, so there is no
  //      envelope at all. The match-automation rule uses Input: '{"task":"match-automation"}'.
  const isScheduledEvent = event?.source === "aws.events" || event?.task === "match-automation";
  if (isScheduledEvent) {
    const scheduleTask = event.task ?? event.detail?.task ?? event.resources?.[0]?.split("/").at(-1);
    const isMatchAutomation = scheduleTask === "match-automation" || scheduleTask === "FantasyMatchAutomation";
    const url = isMatchAutomation
      ? "/api/fantasy/admin/scheduled/match-automation"
      : "/api/fantasy/admin/ai-messages/scheduled";
    const body = isMatchAutomation
      ? {
        actorId: "eventbridge",
        replaceExisting: process.env.FANTASY_MATCH_AUTOMATION_REPLACE_EXISTING === "true",
        overwriteResults: process.env.FANTASY_MATCH_AUTOMATION_OVERWRITE_RESULTS === "true",
      }
      : {
        actorId: "eventbridge",
        autoPublish: process.env.FANTASY_AI_SCHEDULE_AUTO_PUBLISH === "true",
      };
    const result = await handleApiRequest({
      method: "POST",
      url,
      body: JSON.stringify(body),
      env: process.env,
    });
    return {
      statusCode: result.status,
      headers: result.headers,
      body: JSON.stringify(result.body),
    };
  }

  const method = methodFromEvent(event);
  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: "",
    };
  }

  const result = await handleApiRequest({
    method,
    url: `${pathFromEvent(event)}${queryFromEvent(event)}`,
    body: bodyFromEvent(event),
    env: process.env,
  });

  return {
    statusCode: result.status,
    headers: {
      ...(shouldEmitCorsHeaders() ? corsHeaders() : {}),
      ...result.headers,
    },
    body: JSON.stringify(result.body),
  };
};
