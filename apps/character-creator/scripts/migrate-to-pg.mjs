import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");

async function loadEnv() {
  try {
    const text = await readFile(path.join(appRoot, ".env"), "utf-8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {}
}

await loadEnv();

const libraryFile = path.join(appRoot, "data", "character-library.json");
const data = JSON.parse(await readFile(libraryFile, "utf-8"));

const missingDbEnv = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"].filter(k => !process.env[k]);
if (missingDbEnv.length) {
  console.error(`Missing required database env vars: ${missingDbEnv.join(", ")}. Set them in ${path.join(appRoot, ".env")} (see .env.example).`);
  process.exit(1);
}

const client = new Client({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT || 5432),
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

await client.connect();
await client.query(
  "UPDATE character_library SET data = $1, updated_at = NOW() WHERE id = 1",
  [data]
);
await client.end();

const users = Object.keys(data.users ?? {});
const charCount = users.reduce((n, u) => n + (data.users[u].characters?.length ?? 0), 0);
console.log(`Migrated: ${users.length} user(s), ${charCount} character(s) → Postgres ${process.env.DB_HOST}/${process.env.DB_NAME}`);
