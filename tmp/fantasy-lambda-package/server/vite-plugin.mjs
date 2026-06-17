import { handleApiRequest, sendNodeResponse } from "./handler.mjs";

/**
 * Reads a Node request stream body for non-GET API requests.
 *
 * @param request - Incoming HTTP request.
 * @returns Raw UTF-8 request body.
 */
const readRequestBody = (request) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });

/**
 * Creates a Vite middleware adapter for local `/api/*` requests.
 *
 * @param env - Environment-like object passed to the API handler.
 * @returns Connect-compatible middleware function.
 */
const middleware = (env) => async (request, response, next) => {
  if (!request.url?.startsWith("/api/")) return next();
  const body = request.method === "GET" ? undefined : await readRequestBody(request);
  const result = await handleApiRequest({
    method: request.method,
    url: request.url,
    body,
    env,
  });
  sendNodeResponse(response, result);
};

/**
 * Creates a Vite plugin that installs the football API middleware.
 *
 * @param env - Environment-like object passed to API requests in dev and preview.
 * @returns Vite plugin definition.
 */
export const footballApiPlugin = (env) => ({
  name: "full-time-football-api",
  configureServer(server) {
    server.middlewares.use(middleware(env));
  },
  configurePreviewServer(server) {
    server.middlewares.use(middleware(env));
  },
});
