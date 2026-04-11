// ── Run: node db/migrate.js ───────────────────────────────────────────────────
// Creates all tables. Safe to re-run (uses IF NOT EXISTS).

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const db = require("../config/db");

const SQL = `

-- ── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ENUM types ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_provider      AS ENUM ('email','google');
  CREATE TYPE user_role          AS ENUM ('user','admin');
  CREATE TYPE gender_type        AS ENUM ('male','female','other','prefer_not_to_say');
  CREATE TYPE marital_type       AS ENUM ('single','married','divorced','widowed');
  CREATE TYPE income_source_type AS ENUM ('salaried','self_employed','business','freelance','other');
  CREATE TYPE risk_tolerance     AS ENUM ('low','medium','high');
  CREATE TYPE risk_experience    AS ENUM ('beginner','intermediate','expert');
  CREATE TYPE risk_style         AS ENUM ('conservative','balanced','aggressive');
  CREATE TYPE content_type_enum  AS ENUM ('webinar','news','video');
  CREATE TYPE content_status     AS ENUM ('upcoming','completed','cancelled');
  CREATE TYPE content_category   AS ENUM ('market','tax','insurance','planning','general');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Auth
  full_name           VARCHAR(255) NOT NULL,
  email               VARCHAR(255) NOT NULL UNIQUE,
  mobile              VARCHAR(20)  DEFAULT '',
  password_hash       TEXT,
  google_id           VARCHAR(255) UNIQUE,
  provider            user_provider NOT NULL DEFAULT 'email',
  profile_picture     TEXT         DEFAULT '',
  is_email_verified   BOOLEAN      NOT NULL DEFAULT FALSE,
  is_profile_complete BOOLEAN      NOT NULL DEFAULT FALSE,
  role                user_role    NOT NULL DEFAULT 'user',

  -- Personal
  dob                 DATE,
  gender              gender_type  DEFAULT 'prefer_not_to_say',
  occupation          VARCHAR(255) DEFAULT '',
  marital_status      marital_type DEFAULT 'single',
  dependents          SMALLINT     DEFAULT 0 CHECK (dependents >= 0),
  city                VARCHAR(255) DEFAULT '',
  state               VARCHAR(255) DEFAULT '',
  country             VARCHAR(255) DEFAULT 'India',

  -- Income (stored flat for easy querying)
  income_monthly       NUMERIC(15,2) DEFAULT 0 CHECK (income_monthly >= 0),
  income_source        income_source_type DEFAULT 'salaried',
  income_additional    NUMERIC(15,2) DEFAULT 0 CHECK (income_additional >= 0),
  income_growth_pct    NUMERIC(5,2)  DEFAULT 8,

  -- Risk profile
  risk_tolerance      risk_tolerance  DEFAULT 'medium',
  risk_experience     risk_experience DEFAULT 'beginner',
  risk_horizon_years  SMALLINT        DEFAULT 10 CHECK (risk_horizon_years > 0),
  risk_style          risk_style      DEFAULT 'balanced',

  -- Financial arrays stored as JSONB (flexible, fast with GIN index)
  expenses            JSONB  NOT NULL DEFAULT '[]',
  investments         JSONB  NOT NULL DEFAULT '[]',
  goals               JSONB  NOT NULL DEFAULT '[]',
  loans               JSONB  NOT NULL DEFAULT '[]',

  onboarded_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── admins ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'admin',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── content ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content (
  id           UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  type         content_type_enum NOT NULL,
  title        VARCHAR(500)      NOT NULL,
  description  TEXT              DEFAULT '',

  -- Webinar fields
  speaker      VARCHAR(255)    DEFAULT '',
  date         VARCHAR(100)    DEFAULT '',
  time         VARCHAR(100)    DEFAULT '',
  duration     VARCHAR(100)    DEFAULT '',
  link         TEXT            DEFAULT '',
  status       content_status  DEFAULT 'upcoming',

  -- News fields
  summary      TEXT            DEFAULT '',
  source       VARCHAR(255)    DEFAULT '',
  category     content_category DEFAULT 'general',
  urgent       BOOLEAN         DEFAULT FALSE,
  published_at TIMESTAMPTZ     DEFAULT NOW(),

  -- Video fields
  youtube_url  TEXT            DEFAULT '',
  thumbnail    TEXT            DEFAULT '',

  -- Meta
  created_by   UUID            NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  is_published BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id  ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role       ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_complete   ON users(is_profile_complete);
CREATE INDEX IF NOT EXISTS idx_users_created    ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_type     ON content(type, is_published);
CREATE INDEX IF NOT EXISTS idx_content_created  ON content(created_at DESC);

-- JSONB GIN indexes for array fields
CREATE INDEX IF NOT EXISTS idx_users_expenses    ON users USING GIN(expenses);
CREATE INDEX IF NOT EXISTS idx_users_investments ON users USING GIN(investments);
CREATE INDEX IF NOT EXISTS idx_users_goals       ON users USING GIN(goals);
CREATE INDEX IF NOT EXISTS idx_users_loans       ON users USING GIN(loans);

-- ── Auto-update updated_at trigger ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_content_updated_at
    BEFORE UPDATE ON content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;
`;

async function migrate() {
  console.log("🔄 Running migrations...");
  try {
    await db.query(SQL);
    console.log("✅ All tables created / verified successfully.");
    console.log("\n  Tables:");
    console.log("    users    — user accounts + full financial profile (JSONB arrays)");
    console.log("    admins   — admin accounts");
    console.log("    content  — webinars, news, videos");
    console.log("\nNext: run  node db/seed.js  to create the first admin.\n");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    console.error(err);
  } finally {
    await db.pool.end();
  }
}

migrate();
