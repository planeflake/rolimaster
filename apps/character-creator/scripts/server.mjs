import { createServer } from "node:http";
import { readFile, rename, stat, writeFile, mkdir } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const distDir = path.join(appRoot, "dist");
const dataDir = process.env.CHARACTER_DATA_DIR || path.join(appRoot, "data");
const libraryFile = path.join(dataDir, "character-library.json");
const host = argValue("--host") || process.env.HOST || "0.0.0.0";
const port = Number(argValue("--port") || process.env.PORT || 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp"
};

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

function sendJson(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(value));
}

function emptyLibrary() {
  return { version: 1, users: {} };
}

async function readLibrary() {
  try {
    return JSON.parse(await readFile(libraryFile, "utf-8"));
  } catch (error) {
    if (error.code === "ENOENT") return emptyLibrary();
    throw error;
  }
}

async function writeLibrary(value) {
  await mkdir(dataDir, { recursive: true });
  const payload = {
    version: Number(value?.version) || 1,
    users: value?.users && typeof value.users === "object" ? value.users : {}
  };
  const tempFile = `${libraryFile}.tmp`;
  await writeFile(tempFile, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  await rename(tempFile, libraryFile);
}

async function readRequestBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 5_000_000) throw new Error("Request too large");
  }
  return body;
}

async function handleApi(req, res) {
  if (req.url !== "/api/library") {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  if (req.method === "GET") {
    sendJson(res, 200, await readLibrary());
    return;
  }

  if (req.method === "POST") {
    const body = await readRequestBody(req);
    await writeLibrary(JSON.parse(body));
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const requestedPath = decodeURIComponent(url.pathname);
  const relativePath = requestedPath === "/" ? "index.html" : requestedPath.slice(1);
  const filePath = path.resolve(distDir, relativePath);
  const safePath = filePath.startsWith(distDir) ? filePath : path.join(distDir, "index.html");

  try {
    const fileStat = await stat(safePath);
    if (!fileStat.isFile()) throw new Error("Not a file");
    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(safePath).toLowerCase()] || "application/octet-stream"
    });
    createReadStream(safePath).pipe(res);
  } catch {
    const fallback = path.join(distDir, "index.html");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    createReadStream(fallback).pipe(res);
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.url?.startsWith("/api/")) {
      await handleApi(req, res);
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(port, host, () => {
  console.log(`Aethergate Character Creator: http://${host}:${port}`);
  console.log(`Shared character library: ${libraryFile}`);
});
