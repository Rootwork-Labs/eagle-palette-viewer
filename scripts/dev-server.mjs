import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT || 5174);
const host = process.env.HOST || "127.0.0.1";
const defaultFixture = resolve(root, "test/fixtures/sample.afpalette");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const requested = decoded === "/" ? "/viewer/palette.html" : decoded;
  const resolved = resolve(join(root, normalize(requested)));
  return resolved.startsWith(root) ? resolved : null;
}

const server = createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${host}`);
  const filePath = safePath(requestUrl.pathname);
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "Content-Length": fileStat.size
    });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.on("error", (error) => {
  console.error(`Could not start dev server on http://${host}:${port}/`);
  console.error(error.message);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  const viewerPath = encodeURIComponent(defaultFixture);
  console.log(`Palette Viewer dev server: http://${host}:${port}/`);
  console.log(`AF palette preview: http://${host}:${port}/viewer/palette.html?path=${viewerPath}`);
  console.log("Pass ?path=/absolute/path/to/file.afpalette or .css for other fixtures.");
  console.log("Note: viewer require() calls only work inside Eagle; this server is for static asset layout checks.");
});
