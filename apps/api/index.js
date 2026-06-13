import express from "express";
import cors from "cors";
import { pool, initDb } from "./db.js";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// GET /api/library — build library structure from characters table
app.get("/api/library", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT data FROM characters ORDER BY created_at ASC"
    );
    const users = {};
    for (const { data: char } of rows) {
      const uid = char.ownerId;
      if (!uid) continue;
      if (!users[uid]) users[uid] = { id: uid, characters: [] };
      users[uid].characters.push(char);
    }
    res.json({ version: 1, users });
  } catch (err) {
    console.error("GET /api/library:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/library — sync full library to DB (upsert + delete removed)
app.post("/api/library", async (req, res) => {
  const { users } = req.body ?? {};
  if (!users) return res.status(400).json({ error: "users required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const [userId, user] of Object.entries(users)) {
      const chars = user.characters ?? [];
      const currentIds = chars.map((c) => c.id);

      // Delete characters that are no longer in the payload for this user
      if (currentIds.length > 0) {
        await client.query(
          "DELETE FROM characters WHERE owner_id = $1 AND id <> ALL($2::text[])",
          [userId, currentIds]
        );
      } else {
        await client.query("DELETE FROM characters WHERE owner_id = $1", [userId]);
      }

      // Upsert current characters
      for (const char of chars) {
        await client.query(
          `INSERT INTO characters (id, owner_id, data, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE
             SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
          [
            char.id,
            char.ownerId ?? userId,
            char,
            char.createdAt ?? new Date().toISOString(),
            char.updatedAt ?? new Date().toISOString()
          ]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/library:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("DB init failed:", err.message);
    process.exit(1);
  });
