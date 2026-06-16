import { handleApiRequest, sendNodeResponse } from "./handler.mjs";

const middleware = (env) => async (request, response, next) => {
  if (!request.url?.startsWith("/api/")) return next();
  const result = await handleApiRequest({
    method: request.method,
    url: request.url,
    env,
  });
  sendNodeResponse(response, result);
};

export const footballApiPlugin = (env) => ({
  name: "full-time-football-api",
  configureServer(server) {
    server.middlewares.use(middleware(env));
  },
  configurePreviewServer(server) {
    server.middlewares.use(middleware(env));
  },
});
