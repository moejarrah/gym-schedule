// npm run preview: serves the app at http://127.0.0.1:4173/ (no dependencies).
// Also used by the browser tests. `node tools/serve.mjs --lan` listens on your
// Wi-Fi address so a phone on the same network can open it (offline mode and the
// installed app's saved data aren't available that way; it's for checking the UI).

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

export function startServer({ root = ROOT, port = 0, host = "127.0.0.1" } = {}) {
  const server = createServer(async (request, response) => {
    const path = decodeURIComponent(new URL(request.url, "http://local").pathname);
    let file = normalize(join(root, path));
    if (!file.startsWith(normalize(root))) {
      response.writeHead(403).end();
      return;
    }
    if (path.endsWith("/")) file = join(file, "index.html");
    try {
      const body = await readFile(file);
      response.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
      response.end(body);
    } catch (_) {
      response.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
    }
  });
  return new Promise((resolve) => {
    server.listen(port, host, () => {
      const { port: actualPort } = server.address();
      resolve({ server, port: actualPort, url: `http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${actualPort}/`, close: () => new Promise((done) => server.close(done)) });
    });
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  const lan = process.argv.includes("--lan");
  const { port } = await startServer({ port: 4173, host: lan ? "0.0.0.0" : "127.0.0.1" });
  console.log(`Gym Schedule running at http://127.0.0.1:${port}/`);
  if (lan) {
    for (const address of Object.values(networkInterfaces()).flat()) {
      if (address?.family === "IPv4" && !address.internal) console.log(`On your phone (same Wi-Fi): http://${address.address}:${port}/`);
    }
  }
}
