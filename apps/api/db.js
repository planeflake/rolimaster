import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  host: "10.0.0.200",
  port: 5432,
  database: "rolemaster",
  user: "postgres",
  password: "."
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
