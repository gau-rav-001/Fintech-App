require("dotenv").config();
const { Pool } = require("pg");

// ── Pool configuration ────────────────────────────────────────────────────────
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      host:     process.env.DB_HOST     || "localhost",
      port:     parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME     || "smartfinance",
      user:     process.env.DB_USER     || "postgres",
      password: process.env.DB_PASSWORD || "",
      ssl:      process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

// ── Test connection ───────────────────────────────────────────────────────────
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ PostgreSQL connection failed:", err.message);
    console.error("   Check your .env DATABASE_URL or DB_* variables.");
    process.exit(1);
  }
  release();
  console.log("✅ PostgreSQL connected successfully");
});

pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err.message);
});

// ── Query helper ──────────────────────────────────────────────────────────────
// Usage: const { rows } = await db.query("SELECT ...", [params])
const db = {
  query:   (text, params) => pool.query(text, params),
  pool,

  // Transaction helper
  transaction: async (fn) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
};

module.exports = db;
