require("../config/env").loadEnv();
const bcrypt = require("bcryptjs");
const db = require("../config/db");

async function seed() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "";
  const fullName = process.env.SEED_ADMIN_NAME?.trim();
  const allowed = (process.env.ADMIN_ALLOWED_EMAILS || "").split(",").map(value => value.trim().toLowerCase());
  if (!fullName || fullName.length > 255 || !email || email.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !allowed.includes(email) ||
      password.length < 12 || Buffer.byteLength(password) > 72) {
    throw new Error("Invalid admin bootstrap configuration");
  }
  await db.transaction(async client => {
    await client.query("SELECT pg_advisory_xact_lock(719042116)");
    const existing = await client.query("SELECT id FROM admins LIMIT 1");
    if (existing.rowCount) return;
    const hash = await bcrypt.hash(password, 12);
    await client.query("INSERT INTO admins (full_name, email, password_hash) VALUES ($1, $2, $3)", [fullName, email, hash]);
  });
}
seed().then(() => console.log("Administrator bootstrap complete.")).catch(error => {
  console.error("Administrator bootstrap failed", error.code || error.name);
  process.exitCode = 1;
}).finally(() => db.pool.end());
