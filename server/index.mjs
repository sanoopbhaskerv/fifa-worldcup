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

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};

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

const server = createServer(async (request, response) => {
  try {
    if (request.url?.startsWith("/api/")) {
      const result = await handleApiRequest({
        method: request.method,
        url: request.url,
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
