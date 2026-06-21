import { handleApiRequest } from "../handler.mjs";

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
  if (event?.source === "aws.events") {
    const scheduleTask = event.detail?.task ?? event.resources?.[0]?.split("/").at(-1);
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
