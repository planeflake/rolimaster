import { createServer } from "node:http";
import { readFile, rename, stat, writeFile, mkdir } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot   = path.resolve(__dirname, "..");

// ── Env / config ──────────────────────────────────────────────────────────────

async function loadEnv() {
  try {
    const text = await readFile(path.join(appRoot, ".env"), "utf-8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

await loadEnv();

const missingDbEnv = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"].filter(k => !process.env[k]);
if (missingDbEnv.length) {
  console.error(`Missing required database env vars: ${missingDbEnv.join(", ")}. Set them in ${path.join(appRoot, ".env")} (see .env.example).`);
  process.exit(1);
}

const distDir      = path.join(appRoot, "dist");
const dataDir      = process.env.CHARACTER_DATA_DIR || path.join(appRoot, "data");
const gameDataFile = path.join(appRoot, "src", "lib", "generated-data.json");
const encyclopediaRevealFile = path.join(dataDir, "encyclopedia-reveals.json");
const atlasMarkerFile = path.join(dataDir, "atlas-markers.json");
const host = argValue("--host") || process.env.HOST || "0.0.0.0";
const port = Number(argValue("--port") || process.env.PORT || 4173);

const pool = new Pool({
  host:                    process.env.DB_HOST,
  port:                    Number(process.env.DB_PORT || 5432),
  user:                    process.env.DB_USER,
  password:                process.env.DB_PASSWORD,
  database:                process.env.DB_NAME,
  connectionTimeoutMillis: 3000,
  max: 10
});

let pgAvailable = false;

// ── Schema init ───────────────────────────────────────────────────────────────

const GAME_TABLES = ["races","cultures","professions","spell_lists","talents","flaws","training_packages","skills"];

async function initDb() {
  try {
    // Game data tables
    for (const t of GAME_TABLES) {
      await pool.query(`CREATE TABLE IF NOT EXISTS ${t} (id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    }
    // Character tables (created by migration script, but ensure they exist)
    await pool.query(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL)`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL DEFAULT '', race_id TEXT NOT NULL DEFAULT '',
        culture_id TEXT NOT NULL DEFAULT '', profession_id TEXT NOT NULL DEFAULT '',
        stat_pool INTEGER NOT NULL DEFAULT 700, talent_pool INTEGER NOT NULL DEFAULT 40,
        training_pool INTEGER NOT NULL DEFAULT 50, spell_pool INTEGER NOT NULL DEFAULT 45,
        xp INTEGER NOT NULL DEFAULT 45, spent_xp INTEGER NOT NULL DEFAULT 0, current_hp INTEGER,
        stat_points JSONB NOT NULL DEFAULT '{}', skill_ranks JSONB NOT NULL DEFAULT '{}',
        skill_tiers JSONB NOT NULL DEFAULT '{}',
        pp_ranks JSONB NOT NULL DEFAULT '{"arcane":0,"channeling":0,"essence":0,"mentalism":0,"psionic":0}',
        spell_ranks JSONB NOT NULL DEFAULT '{}', directed_spells JSONB NOT NULL DEFAULT '{}',
        spell_list_ids TEXT[] NOT NULL DEFAULT '{}', talent_ids TEXT[] NOT NULL DEFAULT '{}',
        flaw_ids TEXT[] NOT NULL DEFAULT '{}', training_package_ids TEXT[] NOT NULL DEFAULT '{}',
        custom_rule_ids TEXT[] NOT NULL DEFAULT '{}', custom_rules TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS character_languages (
        id SERIAL PRIMARY KEY, character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 0, name TEXT NOT NULL DEFAULT '',
        spoken INTEGER NOT NULL DEFAULT 0, written INTEGER NOT NULL DEFAULT 0
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS character_inventory (
        id SERIAL PRIMARY KEY, character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 0, name TEXT NOT NULL DEFAULT '',
        qty INTEGER NOT NULL DEFAULT 1, location TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT '', weight NUMERIC NOT NULL DEFAULT 0,
        value NUMERIC NOT NULL DEFAULT 0, notes TEXT NOT NULL DEFAULT ''
      )
    `);
    pgAvailable = true;
    console.log("Postgres: connected to", `${process.env.DB_HOST}/${process.env.DB_NAME}`);
  } catch (err) {
    pgAvailable = false;
    console.warn(`Postgres: unavailable (${err.message})`);
  }
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : "";
}

function sendJson(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(value));
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 5_000_000) throw new Error("Request too large");
  }
  return body;
}

async function readJson(req) {
  return JSON.parse(await readBody(req));
}

async function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(tempPath, filePath);
}

// ── Character helpers ─────────────────────────────────────────────────────────

function rowToCharacter(row) {
  return {
    id:                  row.id,
    ownerId:             row.owner_id,
    name:                row.name,
    raceId:              row.race_id,
    cultureId:           row.culture_id,
    professionId:        row.profession_id,
    statPool:            row.stat_pool,
    talentPool:          row.talent_pool,
    trainingPool:        row.training_pool,
    spellPool:           row.spell_pool,
    xp:                  row.xp,
    spentXp:             row.spent_xp,
    currentHp:           row.current_hp,
    statPoints:          row.stat_points   ?? {},
    skillRanks:          row.skill_ranks   ?? {},
    skillTiers:          row.skill_tiers   ?? {},
    ppRanks:             row.pp_ranks      ?? { arcane:0, channeling:0, essence:0, mentalism:0, psionic:0 },
    spellRanks:          row.spell_ranks   ?? {},
    directedSpells:      row.directed_spells ?? {},
    spellListIds:        row.spell_list_ids ?? [],
    talentIds:           row.talent_ids    ?? [],
    flawIds:             row.flaw_ids      ?? [],
    trainingPackageIds:  row.training_package_ids ?? [],
    customRuleIds:       row.custom_rule_ids ?? [],
    customRules:         row.custom_rules  ?? "",
    createdAt:           row.created_at,
    updatedAt:           row.updated_at,
  };
}

async function getCharacter(id) {
  const [charResult, langResult, invResult] = await Promise.all([
    pool.query("SELECT * FROM characters WHERE id = $1", [id]),
    pool.query("SELECT * FROM character_languages WHERE character_id = $1 ORDER BY sort_order, id", [id]),
    pool.query("SELECT * FROM character_inventory WHERE character_id = $1 ORDER BY sort_order, id", [id]),
  ]);
  if (!charResult.rows[0]) return null;
  const char = rowToCharacter(charResult.rows[0]);
  char.languages = langResult.rows.map(r => ({ id: r.id, name: r.name, spoken: r.spoken, written: r.written }));
  char.inventory = invResult.rows.map(r => ({ id: r.id, name: r.name, qty: r.qty, location: r.location, status: r.status, weight: Number(r.weight), value: Number(r.value), notes: r.notes }));
  return char;
}

// ── Route handlers ────────────────────────────────────────────────────────────

async function handleGetUsers(req, res) {
  const result = await pool.query(`
    SELECT u.id, u.name,
      json_agg(json_build_object('id', c.id, 'name', c.name, 'raceId', c.race_id, 'professionId', c.profession_id, 'updatedAt', c.updated_at)
        ORDER BY c.updated_at DESC) FILTER (WHERE c.id IS NOT NULL) AS characters
    FROM users u
    LEFT JOIN characters c ON c.owner_id = u.id
    GROUP BY u.id, u.name
    ORDER BY u.name
  `);
  sendJson(res, 200, result.rows.map(r => ({ id: r.id, name: r.name, characters: r.characters ?? [] })));
}

async function handleCreateCharacter(req, res, userId) {
  const body = await readJson(req);
  const id   = body.id || `char-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  await pool.query(
    `INSERT INTO characters (id, owner_id, name) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [id, userId, body.name ?? ""]
  );
  const char = await getCharacter(id);
  sendJson(res, 201, char);
}

async function handleGetCharacter(req, res, charId) {
  const char = await getCharacter(charId);
  if (!char) { sendJson(res, 404, { error: "Character not found" }); return; }
  sendJson(res, 200, char);
}

async function handleDeleteCharacter(req, res, charId) {
  await pool.query("DELETE FROM characters WHERE id = $1", [charId]);
  sendJson(res, 200, { ok: true });
}

// Section patch handlers
const SECTION_PATCHES = {
  core: (b) => ({
    sql: `UPDATE characters SET name=$2, race_id=$3, culture_id=$4, profession_id=$5, updated_at=NOW() WHERE id=$1`,
    params: (id) => [id, b.name ?? "", b.raceId ?? "", b.cultureId ?? "", b.professionId ?? ""]
  }),
  stats: (b) => ({
    sql: `UPDATE characters SET stat_pool=$2, stat_points=$3, updated_at=NOW() WHERE id=$1`,
    params: (id) => [id, b.statPool ?? 700, JSON.stringify(b.statPoints ?? {})]
  }),
  skills: (b) => ({
    sql: `UPDATE characters SET skill_ranks=$2, skill_tiers=$3, xp=$4, spent_xp=$5, updated_at=NOW() WHERE id=$1`,
    params: (id) => [id, JSON.stringify(b.skillRanks ?? {}), JSON.stringify(b.skillTiers ?? {}), b.xp ?? 45, b.spentXp ?? 0]
  }),
  spells: (b) => ({
    sql: `UPDATE characters SET spell_list_ids=$2, spell_ranks=$3, spell_pool=$4, updated_at=NOW() WHERE id=$1`,
    params: (id) => [id, b.spellListIds ?? [], JSON.stringify(b.spellRanks ?? {}), b.spellPool ?? 45]
  }),
  talents: (b) => ({
    sql: `UPDATE characters SET talent_ids=$2, talent_pool=$3, updated_at=NOW() WHERE id=$1`,
    params: (id) => [id, b.talentIds ?? [], b.talentPool ?? 40]
  }),
  flaws: (b) => ({
    sql: `UPDATE characters SET flaw_ids=$2, updated_at=NOW() WHERE id=$1`,
    params: (id) => [id, b.flawIds ?? []]
  }),
  training: (b) => ({
    sql: `UPDATE characters SET training_package_ids=$2, training_pool=$3, updated_at=NOW() WHERE id=$1`,
    params: (id) => [id, b.trainingPackageIds ?? [], b.trainingPool ?? 50]
  }),
  "directed-spells": (b) => ({
    sql: `UPDATE characters SET directed_spells=$2, updated_at=NOW() WHERE id=$1`,
    params: (id) => [id, JSON.stringify(b.directedSpells ?? {})]
  }),
  pp: (b) => ({
    sql: `UPDATE characters SET pp_ranks=$2, updated_at=NOW() WHERE id=$1`,
    params: (id) => [id, JSON.stringify(b.ppRanks ?? {})]
  }),
  hp: (b) => ({
    sql: `UPDATE characters SET current_hp=$2, updated_at=NOW() WHERE id=$1`,
    params: (id) => [id, b.currentHp ?? null]
  }),
  "custom-rules": (b) => ({
    sql: `UPDATE characters SET custom_rule_ids=$2, custom_rules=$3, updated_at=NOW() WHERE id=$1`,
    params: (id) => [id, b.customRuleIds ?? [], b.customRules ?? ""]
  }),
};

async function handlePatchSection(req, res, charId, section) {
  const patch = SECTION_PATCHES[section];
  if (!patch) { sendJson(res, 404, { error: "Unknown section" }); return; }
  const body = await readJson(req);
  const { sql, params } = patch(body);
  await pool.query(sql, params(charId));
  sendJson(res, 200, { ok: true });
}

// Language CRUD
async function handleLanguages(req, res, charId) {
  if (req.method === "GET") {
    const r = await pool.query("SELECT * FROM character_languages WHERE character_id=$1 ORDER BY sort_order, id", [charId]);
    sendJson(res, 200, r.rows.map(r => ({ id: r.id, name: r.name, spoken: r.spoken, written: r.written })));
    return;
  }
  if (req.method === "POST") {
    const b = await readJson(req);
    const maxOrder = await pool.query("SELECT COALESCE(MAX(sort_order),0)+1 AS n FROM character_languages WHERE character_id=$1", [charId]);
    const r = await pool.query(
      "INSERT INTO character_languages (character_id, sort_order, name, spoken, written) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [charId, maxOrder.rows[0].n, b.name ?? "", b.spoken ?? 0, b.written ?? 0]
    );
    sendJson(res, 201, { id: r.rows[0].id, name: r.rows[0].name, spoken: r.rows[0].spoken, written: r.rows[0].written });
    return;
  }
  if (req.method === "PUT") {
    const items = await readJson(req);
    await pool.query("DELETE FROM character_languages WHERE character_id=$1", [charId]);
    const rows = [];
    for (const [i, b] of items.entries()) {
      const r = await pool.query(
        "INSERT INTO character_languages (character_id, sort_order, name, spoken, written) VALUES ($1,$2,$3,$4,$5) RETURNING *",
        [charId, i, b.name ?? "", b.spoken ?? 0, b.written ?? 0]
      );
      rows.push({ id: r.rows[0].id, name: r.rows[0].name, spoken: r.rows[0].spoken, written: r.rows[0].written });
    }
    sendJson(res, 200, rows);
    return;
  }
  sendJson(res, 405, { error: "Method not allowed" });
}

async function handleLanguage(req, res, charId, langId) {
  if (req.method === "PATCH") {
    const b = await readJson(req);
    await pool.query(
      "UPDATE character_languages SET name=$1, spoken=$2, written=$3 WHERE id=$4 AND character_id=$5",
      [b.name ?? "", b.spoken ?? 0, b.written ?? 0, langId, charId]
    );
    sendJson(res, 200, { ok: true });
    return;
  }
  if (req.method === "DELETE") {
    await pool.query("DELETE FROM character_languages WHERE id=$1 AND character_id=$2", [langId, charId]);
    sendJson(res, 200, { ok: true });
    return;
  }
  sendJson(res, 405, { error: "Method not allowed" });
}

// Inventory CRUD
async function handleInventory(req, res, charId) {
  if (req.method === "GET") {
    const r = await pool.query("SELECT * FROM character_inventory WHERE character_id=$1 ORDER BY sort_order, id", [charId]);
    sendJson(res, 200, r.rows.map(r => ({ id: r.id, name: r.name, qty: r.qty, location: r.location, status: r.status, weight: Number(r.weight), value: Number(r.value), notes: r.notes })));
    return;
  }
  if (req.method === "POST") {
    const b = await readJson(req);
    const maxOrder = await pool.query("SELECT COALESCE(MAX(sort_order),0)+1 AS n FROM character_inventory WHERE character_id=$1", [charId]);
    const r = await pool.query(
      "INSERT INTO character_inventory (character_id, sort_order, name, qty, location, status, weight, value, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
      [charId, maxOrder.rows[0].n, b.name ?? "", b.qty ?? 1, b.location ?? "", b.status ?? "", b.weight ?? 0, b.value ?? 0, b.notes ?? ""]
    );
    const row = r.rows[0];
    sendJson(res, 201, { id: row.id, name: row.name, qty: row.qty, location: row.location, status: row.status, weight: Number(row.weight), value: Number(row.value), notes: row.notes });
    return;
  }
  if (req.method === "PUT") {
    const items = await readJson(req);
    await pool.query("DELETE FROM character_inventory WHERE character_id=$1", [charId]);
    const rows = [];
    for (const [i, b] of items.entries()) {
      const r = await pool.query(
        "INSERT INTO character_inventory (character_id, sort_order, name, qty, location, status, weight, value, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
        [charId, i, b.name ?? "", b.qty ?? 1, b.location ?? "", b.status ?? "", b.weight ?? 0, b.value ?? 0, b.notes ?? ""]
      );
      const row = r.rows[0];
      rows.push({ id: row.id, name: row.name, qty: row.qty, location: row.location, status: row.status, weight: Number(row.weight), value: Number(row.value), notes: row.notes });
    }
    sendJson(res, 200, rows);
    return;
  }
  sendJson(res, 405, { error: "Method not allowed" });
}

async function handleInventoryItem(req, res, charId, itemId) {
  if (req.method === "PATCH") {
    const b = await readJson(req);
    await pool.query(
      "UPDATE character_inventory SET name=$1, qty=$2, location=$3, status=$4, weight=$5, value=$6, notes=$7 WHERE id=$8 AND character_id=$9",
      [b.name ?? "", b.qty ?? 1, b.location ?? "", b.status ?? "", b.weight ?? 0, b.value ?? 0, b.notes ?? "", itemId, charId]
    );
    sendJson(res, 200, { ok: true });
    return;
  }
  if (req.method === "DELETE") {
    await pool.query("DELETE FROM character_inventory WHERE id=$1 AND character_id=$2", [itemId, charId]);
    sendJson(res, 200, { ok: true });
    return;
  }
  sendJson(res, 405, { error: "Method not allowed" });
}

// ── Game data ─────────────────────────────────────────────────────────────────

const GAME_ROUTES = {
  "/api/races":             { table: "races",             sort: "data->>'name'",                                   fallbackKey: "races" },
  "/api/cultures":          { table: "cultures",          sort: "data->>'name'",                                   fallbackKey: "cultures" },
  "/api/professions":       { table: "professions",       sort: "data->>'name'",                                   fallbackKey: "professions" },
  "/api/spell-lists":       { table: "spell_lists",       sort: "data->>'listType', data->>'name'",                fallbackKey: "spellLists" },
  "/api/talents":           { table: "talents",           sort: "data->>'name'",                                   fallbackKey: "talents" },
  "/api/flaws":             { table: "flaws",             sort: "data->>'type', data->>'name'",                    fallbackKey: "flaws" },
  "/api/training-packages": { table: "training_packages", sort: "data->>'name'",                                   fallbackKey: "trainingPackages" },
  "/api/skills":            { table: "skills",            sort: "data->>'name'",                                   fallbackKey: "skills" },
};

let gameDataFallback = null;
let gameDataFallbackMtime = 0;

// Re-read generated-data.json whenever it changes on disk so a rebuild is picked
// up without restarting the server (encyclopedia/maps are served only from here).
async function getGameDataFallback() {
  try {
    const mtime = (await stat(gameDataFile)).mtimeMs;
    if (!gameDataFallback || mtime !== gameDataFallbackMtime) {
      gameDataFallback = JSON.parse(await readFile(gameDataFile, "utf-8"));
      gameDataFallbackMtime = mtime;
    }
  } catch {
    if (!gameDataFallback) gameDataFallback = {};
  }
  return gameDataFallback;
}

async function readGameResource(pathname) {
  const { table, sort, fallbackKey } = GAME_ROUTES[pathname];
  if (pgAvailable) {
    try {
      const r = await pool.query(`SELECT data FROM ${table} ORDER BY ${sort}`);
      return r.rows.map(r => r.data);
    } catch (err) {
      console.warn(`Postgres read error for ${table}:`, err.message);
    }
  }
  const fb = await getGameDataFallback();
  return fb[fallbackKey] ?? [];
}

async function readSpellListsForProfession(professionId) {
  if (pgAvailable) {
    try {
      const profResult = await pool.query("SELECT data->>'realm' AS realm FROM professions WHERE id = $1", [professionId]);
      const realms = (profResult.rows[0]?.realm ?? "").split("/").map(r => r.trim()).filter(Boolean);
      const r = await pool.query(`
        SELECT data FROM spell_lists
        WHERE
          (data->>'listType' = 'Base List' AND data->>'profession' = $1)
          OR (
            data->>'realm' = ANY($2::text[])
            AND (
              data->>'listType' = 'Open List'
              OR ((data->>'listType' IS NULL OR data->>'listType' = '') AND data->>'category' ILIKE 'Open %')
            )
          )
        ORDER BY data->>'listType', data->>'name'
      `, [professionId, realms]);
      return r.rows.map(r => r.data);
    } catch (err) {
      console.warn("Postgres spell list filter error:", err.message);
    }
  }
  const fb = await getGameDataFallback();
  const all = fb.spellLists ?? [];
  const prof = (fb.professions ?? []).find(p => p.id === professionId);
  const realms = (prof?.realm ?? "").split("/").map(r => r.trim()).filter(Boolean);
  return all.filter(l =>
    (l.listType === "Base List" && l.profession === professionId) ||
    (realms.includes(l.realm) && (l.listType === "Open List" || (!l.listType && l.category?.startsWith("Open "))))
  );
}

async function readEncyclopedia() {
  const fb = await getGameDataFallback();
  return fb.encyclopedia ?? [];
}

async function readMaps() {
  const fb = await getGameDataFallback();
  return fb.maps ?? [];
}

async function readEncyclopediaReveals() {
  const stored = await readJsonFile(encyclopediaRevealFile, {});
  // Party-wide reveals: a flat map of entryId -> true. Ignore any legacy per-player shape.
  const revealed = stored && typeof stored.revealed === "object" ? stored.revealed : {};
  return { version: 1, revealed };
}

async function handleEncyclopediaReveals(req, res) {
  if (req.method === "GET") {
    sendJson(res, 200, await readEncyclopediaReveals());
    return;
  }
  if (req.method === "PATCH") {
    const body = await readJson(req);
    const entryId = String(body.entryId ?? "");
    if (!entryId) {
      sendJson(res, 400, { error: "entryId is required" });
      return;
    }

    const reveals = await readEncyclopediaReveals();
    const revealed = { ...reveals.revealed };
    if (body.revealed) revealed[entryId] = true;
    else delete revealed[entryId];

    const next = { version: 1, revealed };
    await writeJsonFile(encyclopediaRevealFile, next);
    sendJson(res, 200, next);
    return;
  }
  sendJson(res, 405, { error: "Method not allowed" });
}

async function readAtlasMarkers() {
  const stored = await readJsonFile(atlasMarkerFile, {});
  const markers = stored && typeof stored.markers === "object" ? stored.markers : {};
  return { version: 1, markers };
}

async function handleAtlasMarkers(req, res, mapId) {
  if (!mapId && req.method === "GET") {
    sendJson(res, 200, await readAtlasMarkers());
    return;
  }
  if (mapId && req.method === "PUT") {
    const body = await readJson(req);
    const list = Array.isArray(body) ? body : [];
    const clean = list
      .filter((m) => m && typeof m.entryId === "string")
      .map((m) => ({ entryId: m.entryId, x: Number(m.x) || 0, y: Number(m.y) || 0 }));

    const current = await readAtlasMarkers();
    const next = { version: 1, markers: { ...current.markers, [mapId]: clean } };
    await writeJsonFile(atlasMarkerFile, next);
    sendJson(res, 200, next);
    return;
  }
  sendJson(res, 405, { error: "Method not allowed" });
}

// ── Router ────────────────────────────────────────────────────────────────────

async function handleApi(req, res) {
  const url      = new URL(req.url, "http://localhost");
  const pathname = url.pathname;
  const method   = req.method;

  // Users
  if (pathname === "/api/users" && method === "GET") { await handleGetUsers(req, res); return; }

  // Create character
  const createCharMatch = pathname.match(/^\/api\/users\/([^/]+)\/characters$/);
  if (createCharMatch && method === "POST") { await handleCreateCharacter(req, res, createCharMatch[1]); return; }

  // Character root
  const charMatch = pathname.match(/^\/api\/characters\/([^/]+)$/);
  if (charMatch) {
    if (method === "GET")    { await handleGetCharacter(req, res, charMatch[1]); return; }
    if (method === "PATCH")  { await handlePatchSection(req, res, charMatch[1], "core"); return; }
    if (method === "DELETE") { await handleDeleteCharacter(req, res, charMatch[1]); return; }
  }

  // Character sections
  const sectionMatch = pathname.match(/^\/api\/characters\/([^/]+)\/(stats|skills|spells|talents|flaws|training|directed-spells|pp|hp|custom-rules)$/);
  if (sectionMatch && method === "PATCH") { await handlePatchSection(req, res, sectionMatch[1], sectionMatch[2]); return; }

  // Languages
  const langsMatch = pathname.match(/^\/api\/characters\/([^/]+)\/languages$/);
  if (langsMatch) { await handleLanguages(req, res, langsMatch[1]); return; }

  const langMatch = pathname.match(/^\/api\/characters\/([^/]+)\/languages\/(\d+)$/);
  if (langMatch) { await handleLanguage(req, res, langMatch[1], Number(langMatch[2])); return; }

  // Inventory
  const invMatch = pathname.match(/^\/api\/characters\/([^/]+)\/inventory$/);
  if (invMatch) { await handleInventory(req, res, invMatch[1]); return; }

  const invItemMatch = pathname.match(/^\/api\/characters\/([^/]+)\/inventory\/(\d+)$/);
  if (invItemMatch) { await handleInventoryItem(req, res, invItemMatch[1], Number(invItemMatch[2])); return; }

  // Spell lists (with optional profession filter)
  if (pathname === "/api/spell-lists") {
    if (method !== "GET") { sendJson(res, 405, { error: "Method not allowed" }); return; }
    const profession = url.searchParams.get("profession");
    sendJson(res, 200, profession ? await readSpellListsForProfession(profession) : await readGameResource("/api/spell-lists"));
    return;
  }

  if (pathname === "/api/encyclopedia") {
    if (method !== "GET") { sendJson(res, 405, { error: "Method not allowed" }); return; }
    sendJson(res, 200, await readEncyclopedia());
    return;
  }

  if (pathname === "/api/maps") {
    if (method !== "GET") { sendJson(res, 405, { error: "Method not allowed" }); return; }
    sendJson(res, 200, await readMaps());
    return;
  }

  if (pathname === "/api/encyclopedia/reveals") {
    await handleEncyclopediaReveals(req, res);
    return;
  }

  if (pathname === "/api/atlas/markers") {
    await handleAtlasMarkers(req, res, "");
    return;
  }

  const markerMatch = pathname.match(/^\/api\/atlas\/markers\/([^/]+)$/);
  if (markerMatch) {
    await handleAtlasMarkers(req, res, decodeURIComponent(markerMatch[1]));
    return;
  }

  // Other game data
  if (pathname in GAME_ROUTES) {
    if (method !== "GET") { sendJson(res, 405, { error: "Method not allowed" }); return; }
    sendJson(res, 200, await readGameResource(pathname));
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

// ── Static files ──────────────────────────────────────────────────────────────

const mimeTypes = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",   ".json": "application/json; charset=utf-8",
  ".png": "image/png",                  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",                ".svg": "image/svg+xml",
  ".ico": "image/x-icon",               ".webp": "image/webp"
};

async function serveStatic(req, res) {
  const url      = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const relative = decodeURIComponent(url.pathname) === "/" ? "index.html" : decodeURIComponent(url.pathname).slice(1);
  const filePath = path.resolve(distDir, relative);
  const safePath = filePath.startsWith(distDir) ? filePath : path.join(distDir, "index.html");
  try {
    const s = await stat(safePath);
    if (!s.isFile()) throw new Error();
    res.writeHead(200, { "Content-Type": mimeTypes[path.extname(safePath).toLowerCase()] || "application/octet-stream" });
    createReadStream(safePath).pipe(res);
  } catch {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    createReadStream(path.join(distDir, "index.html")).pipe(res);
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  try {
    if (req.url?.startsWith("/api/")) { await handleApi(req, res); return; }
    await serveStatic(req, res);
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Server error" });
  }
});

await initDb();

server.listen(port, host, () => {
  console.log(`Aethergate Character Creator: http://${host}:${port}`);
  console.log(`Storage: ${pgAvailable ? `Postgres ${process.env.DB_HOST}/${process.env.DB_NAME}` : "unavailable"}`);
});
