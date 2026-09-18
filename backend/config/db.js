require("./env").loadEnv();
const { Pool } = require("pg");

const hasDbCredentials =
  process.env.DB_HOST ||
  process.env.DB_PORT ||
  process.env.DB_NAME ||
  process.env.DB_USER ||
  process.env.DB_PASSWORD;

// ── Pool configuration ────────────────────────────────────────────────────────
const poolConfig = !hasDbCredentials && process.env.DATABASE_URL
  ? {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  }
  : {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    database: process.env.DB_NAME || "smartfinance",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

console.log("=== Pool Config ===");
console.log({
  source: !hasDbCredentials && process.env.DATABASE_URL ? "DATABASE_URL" : "DB_*",
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ? "***SET***" : "NOT SET",
  ssl: process.env.DB_SSL,
});
const pool = new Pool(poolConfig);

// ── Test connection ───────────────────────────────────────────────────────────
pool.connect((err, client, release) => {
  if (err) {
    const errorDetail = err.message || err.code || (err.errors && err.errors[0]?.message) || JSON.stringify(err);
    console.error("❌ PostgreSQL connection failed:", errorDetail);
    console.error("   Check if PostgreSQL is running and check your .env DATABASE_URL / DB_* credentials.");
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
  query: (text, params) => pool.query(text, params),
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
