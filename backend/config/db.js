require("./env").loadEnv();
const { Pool } = require("pg");

// ── Pool configuration ────────────────────────────────────────────────────────
const useSsl =
  process.env.DB_SSL === "true" ||
  Boolean(
    process.env.DATABASE_URL &&
    (process.env.DATABASE_URL.includes("render.com") ||
     process.env.DATABASE_URL.includes("neon.tech") ||
     process.env.DATABASE_URL.includes("supabase.co") ||
     process.env.DATABASE_URL.includes("sslmode=require"))
  );

const sslConfig = useSsl ? { rejectUnauthorized: false } : false;

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host:     process.env.DB_HOST     || "localhost",
      port:     parseInt(process.env.DB_PORT || "5432", 10),
      database: process.env.DB_NAME     || "smartfinance",
      user:     process.env.DB_USER     || "postgres",
      password: process.env.DB_PASSWORD || "",
      ssl:      sslConfig,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

const pool = new Pool(poolConfig);

// ── Test connection ───────────────────────────────────────────────────────────
pool.connect((err, client, release) => {
  if (err) {
    const errorDetail = err.message || err.code || (err.errors && err.errors[0]?.message) || JSON.stringify(err);
    console.error("❌ PostgreSQL connection failed:", errorDetail);
    if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
      console.error("   👉 REASON: DATABASE_URL is not set in Render environment variables!");
      console.error("   👉 FIX: Go to Render Dashboard -> Your Service -> Environment -> Add DATABASE_URL");
    } else {
      console.error("   Check if PostgreSQL is running and check your DATABASE_URL / DB_* credentials.");
    }
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
