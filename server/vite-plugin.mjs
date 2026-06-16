import { handleApiRequest, sendNodeResponse } from "./handler.mjs";

/**
 * Creates a Vite middleware adapter for local `/api/*` requests.
 *
 * @param env - Environment-like object passed to the API handler.
 * @returns Connect-compatible middleware function.
 */
const middleware = (env) => async (request, response, next) => {
  if (!request.url?.startsWith("/api/")) return next();
  const result = await handleApiRequest({
    method: request.method,
    url: request.url,
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
