// ── Run: node db/migrate_v2.js ────────────────────────────────────────────────
// Creates tables for Phase 2: advisors, advisor_client_relationships, audit_logs.
// Fully additive & idempotent (safe to re-run).

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const db = require("../config/db");

const SQL = `

-- ── 1. Extensions ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 2. ENUM Types ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE advisor_approval_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE relationship_status AS ENUM (
    'invited', 'pending_user_acceptance', 'active', 'rejected', 'suspended', 'terminated', 'reassigned'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE relationship_initiator AS ENUM ('advisor', 'user', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── 3. advisors Table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS advisors (
  id                  UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity & Auth
  full_name           VARCHAR(255)            NOT NULL,
  email               VARCHAR(255)            NOT NULL UNIQUE,
  mobile              VARCHAR(20)             DEFAULT '',
  password_hash       TEXT                    NOT NULL,
  profile_picture     TEXT                    DEFAULT '',
  is_email_verified   BOOLEAN                 NOT NULL DEFAULT FALSE,
  
  -- Professional Credentials & Firm Info
  firm_name           VARCHAR(255)            NOT NULL,
  license_number      VARCHAR(100)            NOT NULL,
  specializations     TEXT[]                  DEFAULT '{}',
  experience_years    SMALLINT                DEFAULT 0 CHECK (experience_years >= 0),
  bio                 TEXT                    DEFAULT '',
  
  -- Location / Jurisdiction
  city                VARCHAR(255)            DEFAULT '',
  state               VARCHAR(255)            DEFAULT '',
  country             VARCHAR(255)            DEFAULT 'India',
  
  -- Lifecycle & Approval State
  approval_status     advisor_approval_status NOT NULL DEFAULT 'pending',
  rejection_reason    TEXT                    DEFAULT '',
  suspension_reason   TEXT                    DEFAULT '',
  approved_by         UUID                    REFERENCES admins(id) ON DELETE SET NULL,
  approved_at         TIMESTAMPTZ,
  
  -- Timestamps
  created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

-- ── 4. advisor_client_relationships Table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS advisor_client_relationships (
  id                    UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  advisor_id            UUID                    NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  user_id               UUID                    REFERENCES users(id) ON DELETE CASCADE,
  client_email          VARCHAR(255)            NOT NULL,
  
  -- Lifecycle State & Origin
  status                relationship_status     NOT NULL DEFAULT 'invited',
  initiated_by          relationship_initiator  NOT NULL DEFAULT 'advisor',
  assigned_by_admin_id  UUID                    REFERENCES admins(id) ON DELETE SET NULL,
  
  -- Token Hash for prospective client invites (SHA-256 hex digest)
  invitation_token_hash VARCHAR(64)             UNIQUE,
  invitation_expires_at TIMESTAMPTZ,
  
  -- Context & Notes
  notes                 TEXT                    DEFAULT '',
  rejection_reason      TEXT                    DEFAULT '',
  
  -- Lifecycle Timestamps
  accepted_at           TIMESTAMPTZ,
  terminated_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

-- ── 5. audit_logs Table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type    VARCHAR(20)  NOT NULL, -- 'admin', 'advisor', 'user', 'system'
  actor_id      UUID         NOT NULL,
  action        VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50)  NOT NULL,
  resource_id   VARCHAR(255) NOT NULL,
  details       JSONB        DEFAULT '{}',
  ip_address    VARCHAR(45)  DEFAULT '',
  user_agent    TEXT         DEFAULT '',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 6. Indexes ────────────────────────────────────────────────────────────────
-- advisors indexes
CREATE INDEX IF NOT EXISTS idx_advisors_email           ON advisors(email);
CREATE INDEX IF NOT EXISTS idx_advisors_approval_status ON advisors(approval_status);
CREATE INDEX IF NOT EXISTS idx_advisors_firm            ON advisors(firm_name);
CREATE INDEX IF NOT EXISTS idx_advisors_created_at      ON advisors(created_at DESC);

-- advisor_client_relationships indexes
CREATE INDEX IF NOT EXISTS idx_acr_advisor_id           ON advisor_client_relationships(advisor_id);
CREATE INDEX IF NOT EXISTS idx_acr_user_id              ON advisor_client_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_acr_client_email         ON advisor_client_relationships(client_email);
CREATE INDEX IF NOT EXISTS idx_acr_status               ON advisor_client_relationships(status);
CREATE INDEX IF NOT EXISTS idx_acr_token_hash           ON advisor_client_relationships(invitation_token_hash) WHERE invitation_token_hash IS NOT NULL;

-- audit_logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_actor              ON audit_logs(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action             ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource           ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created            ON audit_logs(created_at DESC);

-- 🛡️ Partial Unique Index: Exactly one ACTIVE advisor per client
CREATE UNIQUE INDEX IF NOT EXISTS idx_acr_single_active_advisor 
  ON advisor_client_relationships(user_id) 
  WHERE status = 'active' AND user_id IS NOT NULL;

-- ── 7. Auto-update updated_at triggers ────────────────────────────────────────
DO $$ BEGIN
  CREATE TRIGGER trg_advisors_updated_at
    BEFORE UPDATE ON advisors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_acr_updated_at
    BEFORE UPDATE ON advisor_client_relationships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;
`;

async function migrate() {
  console.log("🔄 Running Phase 2.1 Database Migrations...");
  try {
    await db.query(SQL);
    console.log("✅ Phase 2.1 Database objects created / verified successfully.\n");
    console.log("  New Tables:");
    console.log("    • advisors                    — Broker/Advisor identities & professional credentials");
    console.log("    • advisor_client_relationships — Association lifecycle, invitations & client mapping");
    console.log("    • audit_logs                  — Comprehensive compliance & security audit trail");
    console.log("\n  New ENUMs:");
    console.log("    • advisor_approval_status      — ('pending', 'approved', 'rejected', 'suspended')");
    console.log("    • relationship_status          — ('invited', 'pending_user_acceptance', 'active', 'rejected', 'suspended', 'terminated', 'reassigned')");
    console.log("    • relationship_initiator       — ('advisor', 'user', 'admin')");
    console.log("\n  Key Constraints:");
    console.log("    • idx_acr_single_active_advisor — Partial unique index enforcing max 1 active advisor per user\n");
  } catch (err) {
    console.error("❌ Phase 2.1 Migration failed:", err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

migrate();
