import pg from "pg";

const { Pool } = pg;

const missingDbEnv = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"].filter(k => !process.env[k]);
if (missingDbEnv.length) {
  throw new Error(`Missing required database env vars: ${missingDbEnv.join(", ")}`);
}

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS characters (
      id          TEXT PRIMARY KEY,
      owner_id    TEXT NOT NULL,
      data        JSONB NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS characters_owner_id ON characters (owner_id);
  `);
}
