// backend/db/migrate_phase7_2.js
// ── Run: node db/migrate_phase7_2.js ──────────────────────────────────────────
// Phase 7.2: Database Foundation for Advisor ↔ User Workflows & Communication.
// Creates tables:
//   1. notifications          — Multi-actor in-app notification center
//   2. advisor_messages       — Direct messaging between active advisor and client
//   3. advisor_notes          — Advisor notes with strict private vs shared visibility
//   4. advisor_recommendations — Structured advice with action items and client acknowledgement
//   5. appointments           — Internal consultation scheduling with IANA timezone preservation
//
// Fully additive, non-destructive, and idempotent (safe to re-run).

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const db = require("../config/db");

const SQL = `
-- ── 1. Extensions ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 2. Shared Trigger Function ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 3. notifications Table ───────────────────────────────────────────────────
-- Universal notification center for Users, Advisors, and Admins.
-- Polymorphic actor and recipient design decoupled from tight table inheritance.
CREATE TABLE IF NOT EXISTS notifications (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type      VARCHAR(20)  NOT NULL CHECK (recipient_type IN ('user', 'advisor', 'admin')),
  recipient_id        UUID         NOT NULL,
  actor_type          VARCHAR(20)  NOT NULL CHECK (actor_type IN ('user', 'advisor', 'admin', 'system')),
  actor_id            UUID,
  type                VARCHAR(50)  NOT NULL,
  title               VARCHAR(255) NOT NULL CHECK (length(trim(title)) > 0),
  message             TEXT         NOT NULL CHECK (length(trim(message)) > 0),
  action_url          VARCHAR(255) DEFAULT '',
  related_entity_type VARCHAR(50)  DEFAULT '',
  related_entity_id   UUID,
  is_read             BOOLEAN      NOT NULL DEFAULT FALSE,
  read_at             TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread 
  ON notifications(recipient_type, recipient_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created 
  ON notifications(recipient_type, recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_expires_at 
  ON notifications(expires_at) 
  WHERE expires_at IS NOT NULL;

-- ── 4. advisor_messages Table ────────────────────────────────────────────────
-- Direct communication thread between active advisor and client.
-- Foreign keys enforce referential integrity with users, advisors, and relationships.
CREATE TABLE IF NOT EXISTS advisor_messages (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id      UUID         NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  client_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship_id UUID         NOT NULL REFERENCES advisor_client_relationships(id) ON DELETE CASCADE,
  sender_type     VARCHAR(20)  NOT NULL CHECK (sender_type IN ('advisor', 'user')),
  sender_id       UUID         NOT NULL,
  content         TEXT         NOT NULL CHECK (length(trim(content)) > 0 AND length(content) <= 5000),
  attachment_url  TEXT         DEFAULT '',
  is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes for advisor_messages
CREATE INDEX IF NOT EXISTS idx_advisor_messages_rel_created 
  ON advisor_messages(relationship_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_advisor_messages_advisor_created 
  ON advisor_messages(advisor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_advisor_messages_client_created 
  ON advisor_messages(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_advisor_messages_unread 
  ON advisor_messages(relationship_id, sender_type, is_read) 
  WHERE is_read = FALSE;

-- Trigger for advisor_messages updated_at
DO $$ BEGIN
  CREATE TRIGGER trg_advisor_messages_updated_at
    BEFORE UPDATE ON advisor_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── 5. advisor_notes Table ───────────────────────────────────────────────────
-- Advisor compliance and working notes with strict dual-visibility controls.
-- Default visibility is 'private_advisor' to guarantee zero leakage to client APIs.
CREATE TABLE IF NOT EXISTS advisor_notes (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id      UUID         NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  client_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship_id UUID         NOT NULL REFERENCES advisor_client_relationships(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL CHECK (length(trim(title)) > 0),
  content         TEXT         NOT NULL CHECK (length(trim(content)) > 0),
  category        VARCHAR(50)  NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'meeting', 'portfolio_review', 'tax', 'compliance')),
  visibility      VARCHAR(30)  NOT NULL DEFAULT 'private_advisor' CHECK (visibility IN ('private_advisor', 'shared_with_client')),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes for advisor_notes
CREATE INDEX IF NOT EXISTS idx_advisor_notes_rel 
  ON advisor_notes(relationship_id);

CREATE INDEX IF NOT EXISTS idx_advisor_notes_adv_client 
  ON advisor_notes(advisor_id, client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_advisor_notes_client_visibility 
  ON advisor_notes(client_id, visibility, created_at DESC) 
  WHERE visibility = 'shared_with_client';

-- Trigger for advisor_notes updated_at
DO $$ BEGIN
  CREATE TRIGGER trg_advisor_notes_updated_at
    BEFORE UPDATE ON advisor_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── 6. advisor_recommendations Table ─────────────────────────────────────────
-- Formal, auditable advisory deliverables with checklist action items.
-- Tracks client review and acknowledgement state machine.
CREATE TABLE IF NOT EXISTS advisor_recommendations (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id      UUID         NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  client_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship_id UUID         NOT NULL REFERENCES advisor_client_relationships(id) ON DELETE CASCADE,
  category        VARCHAR(50)  NOT NULL CHECK (category IN ('investment', 'retirement', 'debt', 'insurance', 'emergency_fund', 'tax')),
  title           VARCHAR(255) NOT NULL CHECK (length(trim(title)) > 0),
  summary         TEXT         NOT NULL CHECK (length(trim(summary)) > 0),
  action_items    JSONB        NOT NULL DEFAULT '[]'::jsonb,
  priority        VARCHAR(20)  NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status          VARCHAR(30)  NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'acknowledged', 'completed', 'declined')),
  client_feedback TEXT         DEFAULT '',
  valid_until     DATE,
  acknowledged_at TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes for advisor_recommendations
CREATE INDEX IF NOT EXISTS idx_adv_rec_rel_status 
  ON advisor_recommendations(relationship_id, status);

CREATE INDEX IF NOT EXISTS idx_adv_rec_client_status 
  ON advisor_recommendations(client_id, status);

CREATE INDEX IF NOT EXISTS idx_adv_rec_advisor_created 
  ON advisor_recommendations(advisor_id, created_at DESC);

-- Trigger for advisor_recommendations updated_at
DO $$ BEGIN
  CREATE TRIGGER trg_advisor_recommendations_updated_at
    BEFORE UPDATE ON advisor_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── 7. appointments Table ────────────────────────────────────────────────────
-- Consultation scheduling engine with wall-clock time and IANA timezone preservation.
CREATE TABLE IF NOT EXISTS appointments (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id          UUID         NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  client_id           UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship_id     UUID         NOT NULL REFERENCES advisor_client_relationships(id) ON DELETE CASCADE,
  title               VARCHAR(255) NOT NULL CHECK (length(trim(title)) > 0),
  description         TEXT         DEFAULT '',
  appointment_date    DATE         NOT NULL,
  start_time          TIME         NOT NULL,
  end_time            TIME         NOT NULL,
  duration_minutes    INT          NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  timezone            VARCHAR(50)  NOT NULL DEFAULT 'Asia/Kolkata',
  meeting_type        VARCHAR(30)  NOT NULL DEFAULT 'video' CHECK (meeting_type IN ('video', 'phone', 'in_person')),
  meeting_link        TEXT         DEFAULT '',
  location            VARCHAR(255) DEFAULT '',
  status              VARCHAR(30)  NOT NULL DEFAULT 'confirmed' CHECK (status IN ('requested', 'confirmed', 'rescheduled', 'cancelled', 'completed')),
  initiated_by        VARCHAR(20)  NOT NULL CHECK (initiated_by IN ('advisor', 'client')),
  cancellation_reason TEXT         DEFAULT '',
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes for appointments
CREATE INDEX IF NOT EXISTS idx_appointments_advisor_date 
  ON appointments(advisor_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_client_date 
  ON appointments(client_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_rel_date 
  ON appointments(relationship_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_status 
  ON appointments(status);

-- Trigger for appointments updated_at
DO $$ BEGIN
  CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;
`;

async function migrate() {
  console.log("🔄 Running Phase 7.2 Database Migration...");
  try {
    await db.transaction(async (client) => {
      await client.query(SQL);
    });

    console.log("✅ Phase 7.2 Database objects created / verified successfully.\n");
    console.log("  New Tables:");
    console.log("    • notifications          — Multi-actor in-app notification center");
    console.log("    • advisor_messages       — Direct messaging between active advisor and client");
    console.log("    • advisor_notes          — Advisor notes with strict private vs shared visibility");
    console.log("    • advisor_recommendations — Structured advice with action items and client acknowledgement");
    console.log("    • appointments           — Consultation scheduling with IANA timezone preservation");
    console.log("\n  New Triggers:");
    console.log("    • trg_advisor_messages_updated_at");
    console.log("    • trg_advisor_notes_updated_at");
    console.log("    • trg_advisor_recommendations_updated_at");
    console.log("    • trg_appointments_updated_at\n");
  } catch (err) {
    console.error("❌ Phase 7.2 Migration failed:", err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

if (require.main === module) {
  migrate();
}

module.exports = { migrate, SQL };
