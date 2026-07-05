/**
 * Migrates character data from the character_library JSON blob
 * into normalised relational tables.
 *
 * Safe to run multiple times — uses ON CONFLICT DO NOTHING / DO UPDATE.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot   = path.resolve(__dirname, "..");

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

const client = new pg.Client({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

await client.connect();

// ── Create schema ────────────────────────────────────────────────────────────

await client.query(`
  CREATE TABLE IF NOT EXISTS users (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL
  )
`);

await client.query(`
  CREATE TABLE IF NOT EXISTS characters (
    id                   TEXT PRIMARY KEY,
    owner_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                 TEXT NOT NULL DEFAULT '',
    race_id              TEXT NOT NULL DEFAULT '',
    culture_id           TEXT NOT NULL DEFAULT '',
    profession_id        TEXT NOT NULL DEFAULT '',
    stat_pool            INTEGER NOT NULL DEFAULT 700,
    talent_pool          INTEGER NOT NULL DEFAULT 40,
    training_pool        INTEGER NOT NULL DEFAULT 50,
    spell_pool           INTEGER NOT NULL DEFAULT 45,
    xp                   INTEGER NOT NULL DEFAULT 45,
    spent_xp             INTEGER NOT NULL DEFAULT 0,
    current_hp           INTEGER,
    stat_points          JSONB NOT NULL DEFAULT '{}',
    skill_ranks          JSONB NOT NULL DEFAULT '{}',
    skill_tiers          JSONB NOT NULL DEFAULT '{}',
    pp_ranks             JSONB NOT NULL DEFAULT '{"arcane":0,"channeling":0,"essence":0,"mentalism":0,"psionic":0}',
    spell_ranks          JSONB NOT NULL DEFAULT '{}',
    directed_spells      JSONB NOT NULL DEFAULT '{}',
    spell_list_ids       TEXT[] NOT NULL DEFAULT '{}',
    talent_ids           TEXT[] NOT NULL DEFAULT '{}',
    flaw_ids             TEXT[] NOT NULL DEFAULT '{}',
    training_package_ids TEXT[] NOT NULL DEFAULT '{}',
    custom_rule_ids      TEXT[] NOT NULL DEFAULT '{}',
    custom_rules         TEXT NOT NULL DEFAULT '',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

await client.query(`
  CREATE TABLE IF NOT EXISTS character_languages (
    id           SERIAL PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    name         TEXT NOT NULL DEFAULT '',
    spoken       INTEGER NOT NULL DEFAULT 0,
    written      INTEGER NOT NULL DEFAULT 0
  )
`);

await client.query(`
  CREATE TABLE IF NOT EXISTS character_inventory (
    id           SERIAL PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    name         TEXT NOT NULL DEFAULT '',
    qty          INTEGER NOT NULL DEFAULT 1,
    location     TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL DEFAULT '',
    weight       NUMERIC NOT NULL DEFAULT 0,
    value        NUMERIC NOT NULL DEFAULT 0,
    notes        TEXT NOT NULL DEFAULT ''
  )
`);

console.log("Schema ready.");

// ── Read existing blob data ───────────────────────────────────────────────────

const blobResult = await client.query("SELECT data FROM character_library WHERE id = 1");
const library    = blobResult.rows[0]?.data ?? { users: {} };

let userCount = 0, charCount = 0, langCount = 0, itemCount = 0;

for (const user of Object.values(library.users ?? {})) {
  await client.query(
    `INSERT INTO users (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = $2`,
    [user.id, user.name]
  );
  userCount++;

  for (const char of user.characters ?? []) {
    await client.query(`
      INSERT INTO characters (
        id, owner_id, name, race_id, culture_id, profession_id,
        stat_pool, talent_pool, training_pool, spell_pool, xp, spent_xp, current_hp,
        stat_points, skill_ranks, skill_tiers, pp_ranks, spell_ranks, directed_spells,
        spell_list_ids, talent_ids, flaw_ids, training_package_ids, custom_rule_ids, custom_rules,
        created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,$19,
        $20,$21,$22,$23,$24,$25,
        $26,$27
      )
      ON CONFLICT (id) DO UPDATE SET
        name=$3, race_id=$4, culture_id=$5, profession_id=$6,
        stat_pool=$7, talent_pool=$8, training_pool=$9, spell_pool=$10, xp=$11, spent_xp=$12, current_hp=$13,
        stat_points=$14, skill_ranks=$15, skill_tiers=$16, pp_ranks=$17, spell_ranks=$18, directed_spells=$19,
        spell_list_ids=$20, talent_ids=$21, flaw_ids=$22, training_package_ids=$23, custom_rule_ids=$24, custom_rules=$25,
        updated_at=$27
    `, [
      char.id, user.id, char.name ?? "", char.raceId ?? "", char.cultureId ?? "", char.professionId ?? "",
      char.statPool ?? 700, char.talentPool ?? 40, char.trainingPool ?? 50, char.spellPool ?? 45,
      char.xp ?? 45, char.spentXp ?? 0, char.currentHp ?? null,
      JSON.stringify(char.statPoints ?? {}),
      JSON.stringify(char.skillRanks ?? {}),
      JSON.stringify(char.skillTiers ?? {}),
      JSON.stringify(char.ppRanks ?? { arcane:0, channeling:0, essence:0, mentalism:0, psionic:0 }),
      JSON.stringify(char.spellRanks ?? {}),
      JSON.stringify(char.directedSpells ?? {}),
      char.spellListIds ?? [],
      char.talentIds ?? [],
      char.flawIds ?? [],
      char.trainingPackageIds ?? [],
      char.customRuleIds ?? [],
      char.customRules ?? "",
      char.createdAt ? new Date(char.createdAt) : new Date(),
      char.updatedAt ? new Date(char.updatedAt) : new Date(),
    ]);
    charCount++;

    // Languages
    await client.query("DELETE FROM character_languages WHERE character_id = $1", [char.id]);
    for (const [i, lang] of (char.languages ?? []).entries()) {
      await client.query(
        `INSERT INTO character_languages (character_id, sort_order, name, spoken, written) VALUES ($1,$2,$3,$4,$5)`,
        [char.id, i, lang.name ?? "", lang.spoken ?? 0, lang.written ?? 0]
      );
      langCount++;
    }

    // Inventory
    await client.query("DELETE FROM character_inventory WHERE character_id = $1", [char.id]);
    for (const [i, item] of (char.inventory ?? []).entries()) {
      await client.query(
        `INSERT INTO character_inventory (character_id, sort_order, name, qty, location, status, weight, value, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [char.id, i, item.name ?? "", item.qty ?? 1, item.location ?? "", item.status ?? "",
         item.weight ?? 0, item.value ?? 0, item.notes ?? ""]
      );
      itemCount++;
    }
  }
}

console.log(`Migrated: ${userCount} users, ${charCount} characters, ${langCount} languages, ${itemCount} inventory items.`);
await client.end();
