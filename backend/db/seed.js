// ── Run: node db/seed.js ──────────────────────────────────────────────────────
// Creates the default admin account and demo user. Safe to re-run.

require("../config/env").loadEnv();
const bcrypt = require("bcryptjs");
const db     = require("../config/db");

async function seed() {
  console.log("🌱 Seeding initial accounts...");

  // 1. Seed Admin
  const { rows: existingAdmin } = await db.query("SELECT id FROM admins LIMIT 1");
  if (existingAdmin.length === 0) {
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
  } else {
    console.log("ℹ️  Admin account already exists.");
  }

  // 2. Seed Demo Client User
  const { rows: existingUser } = await db.query("SELECT id FROM users WHERE email = 'demo@smartfinance.in' LIMIT 1");
  if (existingUser.length === 0) {
    const userSalt = await bcrypt.genSalt(12);
    const userHash = await bcrypt.hash("demo1234", userSalt);
    await db.query(
      `INSERT INTO users (full_name, email, password_hash, is_email_verified, is_profile_complete, role)
       VALUES ('Demo User', 'demo@smartfinance.in', $1, true, true, 'user')`,
      [userHash]
    );
    console.log("✅ Demo user created: demo@smartfinance.in / demo1234");
  } else {
    console.log("ℹ️  Demo user account already exists.");
  }

  await db.pool.end();
}

seed().catch(err => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
