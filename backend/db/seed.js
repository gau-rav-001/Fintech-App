// ── Run: node db/seed.js ──────────────────────────────────────────────────────
// Creates the default admin account. Only runs once (checks for existing admin).
// The seeded email must match ADMIN_ALLOWED_EMAILS in backend/.env

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const bcrypt = require("bcryptjs");
const db     = require("../config/db");

async function seed() {
  console.log("🌱 Seeding admin account...");

  const { rows: existing } = await db.query("SELECT id FROM admins LIMIT 1");
  if (existing.length > 0) {
    console.log("⚠️  Admin already exists — skipping seed.");
    console.log("   To re-seed: DELETE FROM admins; then run this again.\n");
    await db.pool.end();
    return;
  }

  // Read from .env — defaults to your Gmail
  const email    = process.env.SEED_ADMIN_EMAIL    || "kumbharegaurav100@gmail.com";
  const password = process.env.SEED_ADMIN_PASSWORD || "Admin2024!";
  const fullName = process.env.SEED_ADMIN_NAME     || "Gaurav Kumbhare";

  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(password, salt);

  const { rows } = await db.query(
    `INSERT INTO admins (full_name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, email, full_name`,
    [fullName, email.toLowerCase(), hash]
  );

  console.log("✅ Admin created:");
  console.log("   Name    :", rows[0].full_name);
  console.log("   Email   :", rows[0].email);
  console.log("   Password:", password);
  console.log("   ID      :", rows[0].id);
  console.log("\n⚠️  Change this password after first login.");
  console.log("   OTP will be sent to:", rows[0].email, "\n");

  await db.pool.end();
}

seed().catch(err => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});