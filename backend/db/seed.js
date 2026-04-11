// ── Run: node db/seed.js ──────────────────────────────────────────────────────
// Creates the default admin account. Only runs once (checks for existing admin).

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const bcrypt = require("bcryptjs");
const db     = require("../config/db");

async function seed() {
  console.log("🌱 Seeding admin account...");

  const { rows: existing } = await db.query("SELECT id FROM admins LIMIT 1");
  if (existing.length > 0) {
    console.log("⚠️  Admin already exists — skipping seed.");
    await db.pool.end();
    return;
  }

  const email     = process.env.SEED_ADMIN_EMAIL    || "admin@smartfinance.in";
  const password  = process.env.SEED_ADMIN_PASSWORD || "Admin2024!";
  const fullName  = process.env.SEED_ADMIN_NAME     || "Super Admin";

  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(password, salt);

  const { rows } = await db.query(
    `INSERT INTO admins (full_name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, email, full_name`,
    [fullName, email, hash]
  );

  console.log("✅ Admin created:");
  console.log("   Email:   ", rows[0].email);
  console.log("   Password:", password);
  console.log("   ID:      ", rows[0].id);
  console.log("\n⚠️  Change this password immediately after first login!\n");

  await db.pool.end();
}

seed().catch(err => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
