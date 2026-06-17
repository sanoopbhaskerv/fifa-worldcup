import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleApiRequest, sendNodeResponse } from "./handler.mjs";
import { loadLocalEnv } from "./env.mjs";

await loadLocalEnv();

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const port = Number(process.env.PORT ?? 4173);

/** Content types served by the lightweight production preview server. */
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};

/**
 * Streams a built asset with conservative cache headers for HTML and long-lived
 * immutable cache headers for hashed Vite assets.
 *
 * @param response - Node HTTP response object.
 * @param filePath - Absolute path to the built file to serve.
 * @returns Promise that resolves after the response body is written.
 */
const serveFile = async (response, filePath) => {
  const body = await readFile(filePath);
  const extension = path.extname(filePath);
  const immutable = filePath.includes(`${path.sep}assets${path.sep}`);
  response.writeHead(200, {
    "content-type": contentTypes[extension] ?? "application/octet-stream",
    "cache-control": immutable
      ? "public, max-age=31536000, immutable"
      : extension === ".html" || path.basename(filePath) === "sw.js"
        ? "no-cache"
        : "public, max-age=3600",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
  });
  response.end(body);
};

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
 * HTTP server that handles API routes first, then falls back to the SPA shell.
 *
 * @remarks This server is used for production preview/local hosting. AWS Amplify
 * static hosting uses the built assets directly.
 */
const server = createServer(async (request, response) => {
  try {
    if (request.url?.startsWith("/api/")) {
      const body = request.method === "GET" ? undefined : await readRequestBody(request);
      const result = await handleApiRequest({
        method: request.method,
        url: request.url,
        body,
        env: process.env,
      });
      sendNodeResponse(response, result);
      return;
    }

    const url = new URL(request.url ?? "/", "http://localhost");
    const requested = decodeURIComponent(url.pathname);
    const safePath = path.normalize(requested).replace(/^(\.\.[/\\])+/, "");
    let filePath = path.join(dist, safePath);
    try {
      const fileStat = await stat(filePath);
      if (fileStat.isDirectory()) filePath = path.join(filePath, "index.html");
      await serveFile(response, filePath);
    } catch {
      await serveFile(response, path.join(dist, "index.html"));
    }
  } catch (error) {
    console.error(error);
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end("Internal server error");
  }
});

server.listen(port, () => {
  console.log(`Full Time listening on http://localhost:${port}`);
});
