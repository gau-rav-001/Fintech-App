// ── Run: node db/migrate_ai.js ───────────────────────────────────────────────
// Creates AI-related tables for SmartFinance AI Wealth Assistant.
// Safe to re-run (uses IF NOT EXISTS).

require("../config/env").loadEnv();
const db = require("../config/db");

const SQL = `

-- ── ENUM types for AI tables ─────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE income_frequency       AS ENUM ('monthly','quarterly','annual','one_time');
  CREATE TYPE expense_frequency      AS ENUM ('daily','weekly','monthly','quarterly','annual','one_time');
  CREATE TYPE loan_type_enum         AS ENUM ('home','car','personal','education','credit_card','other');
  CREATE TYPE loan_status            AS ENUM ('active','paid_off','foreclosed');
  CREATE TYPE investment_type_enum   AS ENUM ('mutual_fund','stock','bond','ppf','nps','real_estate','gold','crypto','fd','other');
  CREATE TYPE sip_status             AS ENUM ('active','paused','stopped','completed');
  CREATE TYPE asset_type_enum        AS ENUM ('savings_account','fd','ppf','nps','real_estate','gold','vehicle','other');
  CREATE TYPE goal_category_enum     AS ENUM ('retirement','home','education','wealth','emergency','travel','wedding','other');
  CREATE TYPE goal_status            AS ENUM ('planning','active','achieved','abandoned');
  CREATE TYPE alert_type_enum        AS ENUM ('savings_warning','goal_deadline','investment_rebalance','tax_saving','debt_warning','milestone','emergency_fund','other');
  CREATE TYPE alert_priority         AS ENUM ('low','medium','high','critical');
  CREATE TYPE message_role           AS ENUM ('user','assistant','system');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── financial_profiles ────────────────────────────────────────────────────────
-- Extended financial snapshot - computed and stored for performance
CREATE TABLE IF NOT EXISTS financial_profiles (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Computed totals (updated via trigger or app logic)
  total_assets          NUMERIC(15,2) DEFAULT 0 CHECK (total_assets >= 0),
  total_liabilities     NUMERIC(15,2) DEFAULT 0 CHECK (total_liabilities >= 0),
  net_worth             NUMERIC(15,2) DEFAULT 0,
  
  total_monthly_income  NUMERIC(15,2) DEFAULT 0 CHECK (total_monthly_income >= 0),
  total_monthly_expense NUMERIC(15,2) DEFAULT 0 CHECK (total_monthly_expense >= 0),
  monthly_savings       NUMERIC(15,2) DEFAULT 0,
  savings_rate_pct      NUMERIC(5,2)  DEFAULT 0 CHECK (savings_rate_pct >= 0 AND savings_rate_pct <= 100),
  
  total_invested        NUMERIC(15,2) DEFAULT 0 CHECK (total_invested >= 0),
  total_investment_value NUMERIC(15,2) DEFAULT 0 CHECK (total_investment_value >= 0),
  investment_returns    NUMERIC(15,2) DEFAULT 0,
  investment_return_pct NUMERIC(8,2)  DEFAULT 0,
  
  monthly_sip_amount    NUMERIC(15,2) DEFAULT 0 CHECK (monthly_sip_amount >= 0),
  monthly_emi_amount    NUMERIC(15,2) DEFAULT 0 CHECK (monthly_emi_amount >= 0),
  
  -- Insurance
  life_insurance_cover  NUMERIC(15,2) DEFAULT 0 CHECK (life_insurance_cover >= 0),
  health_insurance_cover NUMERIC(15,2) DEFAULT 0 CHECK (health_insurance_cover >= 0),
  
  -- Emergency fund
  emergency_fund_target NUMERIC(15,2) DEFAULT 0 CHECK (emergency_fund_target >= 0),
  emergency_fund_current NUMERIC(15,2) DEFAULT 0 CHECK (emergency_fund_current >= 0),
  
  last_calculated_at    TIMESTAMPTZ  DEFAULT NOW(),
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── income_records ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS income_records (
  id          UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  source      VARCHAR(255)      NOT NULL,
  amount      NUMERIC(15,2)     NOT NULL CHECK (amount > 0),
  frequency   income_frequency  NOT NULL DEFAULT 'monthly',
  
  -- For recurring income (salary, rent, etc.)
  start_date  DATE,
  end_date    DATE,
  is_active   BOOLEAN           NOT NULL DEFAULT TRUE,
  
  -- For one-time income (bonus, gifts, etc.)
  received_date DATE,
  
  category    VARCHAR(100)      DEFAULT 'other',
  notes       TEXT              DEFAULT '',
  
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- ── expense_records ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expense_records (
  id          UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID               NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  category    VARCHAR(255)       NOT NULL,
  amount      NUMERIC(15,2)      NOT NULL CHECK (amount > 0),
  frequency   expense_frequency  NOT NULL DEFAULT 'monthly',
  
  -- For recurring expenses (rent, utilities, subscriptions)
  start_date  DATE,
  end_date    DATE,
  is_active   BOOLEAN            NOT NULL DEFAULT TRUE,
  
  -- For one-time expenses
  expense_date DATE,
  
  subcategory VARCHAR(100)       DEFAULT '',
  merchant    VARCHAR(255)       DEFAULT '',
  notes       TEXT               DEFAULT '',
  
  created_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

-- ── loans ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loans (
  id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  loan_type             loan_type_enum  NOT NULL,
  lender                VARCHAR(255)    NOT NULL,
  
  principal_amount      NUMERIC(15,2)   NOT NULL CHECK (principal_amount > 0),
  outstanding_amount    NUMERIC(15,2)   NOT NULL CHECK (outstanding_amount >= 0),
  interest_rate_pct     NUMERIC(5,2)    NOT NULL CHECK (interest_rate_pct >= 0),
  
  emi                   NUMERIC(15,2)   NOT NULL CHECK (emi >= 0),
  tenure_months         INT             NOT NULL CHECK (tenure_months > 0),
  remaining_months      INT             CHECK (remaining_months >= 0),
  
  start_date            DATE            NOT NULL,
  end_date              DATE,
  
  status                loan_status     NOT NULL DEFAULT 'active',
  
  account_number        VARCHAR(100)    DEFAULT '',
  notes                 TEXT            DEFAULT '',
  
  created_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── investments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investments (
  id                UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID                 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  investment_type   investment_type_enum NOT NULL,
  name              VARCHAR(255)         NOT NULL,
  
  invested_amount   NUMERIC(15,2)        NOT NULL CHECK (invested_amount > 0),
  current_value     NUMERIC(15,2)        NOT NULL CHECK (current_value >= 0),
  returns           NUMERIC(15,2)        DEFAULT 0,
  return_pct        NUMERIC(8,2)         DEFAULT 0,
  
  purchase_date     DATE                 NOT NULL,
  maturity_date     DATE,
  
  quantity          NUMERIC(15,4)        DEFAULT 0 CHECK (quantity >= 0),
  average_price     NUMERIC(15,2)        DEFAULT 0 CHECK (average_price >= 0),
  
  platform          VARCHAR(255)         DEFAULT '',
  folio_number      VARCHAR(100)         DEFAULT '',
  notes             TEXT                 DEFAULT '',
  
  is_active         BOOLEAN              NOT NULL DEFAULT TRUE,
  
  created_at        TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

-- ── sips (Systematic Investment Plans) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS sips (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  investment_id     UUID            REFERENCES investments(id) ON DELETE SET NULL,
  
  fund_name         VARCHAR(255)    NOT NULL,
  amount            NUMERIC(15,2)   NOT NULL CHECK (amount > 0),
  
  frequency         VARCHAR(50)     NOT NULL DEFAULT 'monthly',
  sip_date          INT             CHECK (sip_date >= 1 AND sip_date <= 31),
  
  start_date        DATE            NOT NULL,
  end_date          DATE,
  
  status            sip_status      NOT NULL DEFAULT 'active',
  
  total_invested    NUMERIC(15,2)   DEFAULT 0 CHECK (total_invested >= 0),
  current_value     NUMERIC(15,2)   DEFAULT 0 CHECK (current_value >= 0),
  returns           NUMERIC(15,2)   DEFAULT 0,
  
  platform          VARCHAR(255)    DEFAULT '',
  folio_number      VARCHAR(100)    DEFAULT '',
  notes             TEXT            DEFAULT '',
  
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── assets ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assets (
  id              UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  asset_type      asset_type_enum  NOT NULL,
  name            VARCHAR(255)     NOT NULL,
  
  current_value   NUMERIC(15,2)    NOT NULL CHECK (current_value >= 0),
  purchase_value  NUMERIC(15,2)    DEFAULT 0 CHECK (purchase_value >= 0),
  purchase_date   DATE,
  
  location        VARCHAR(255)     DEFAULT '',
  account_number  VARCHAR(100)     DEFAULT '',
  notes           TEXT             DEFAULT '',
  
  is_liquid       BOOLEAN          NOT NULL DEFAULT TRUE,
  
  created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- ── goals ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id                  UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID               NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  name                VARCHAR(255)       NOT NULL,
  category            goal_category_enum NOT NULL,
  
  target_amount       NUMERIC(15,2)      NOT NULL CHECK (target_amount > 0),
  current_amount      NUMERIC(15,2)      DEFAULT 0 CHECK (current_amount >= 0),
  
  target_date         DATE               NOT NULL,
  priority            INT                DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  
  status              goal_status        NOT NULL DEFAULT 'planning',
  
  monthly_contribution NUMERIC(15,2)     DEFAULT 0 CHECK (monthly_contribution >= 0),
  expected_return_pct NUMERIC(5,2)       DEFAULT 8 CHECK (expected_return_pct >= 0),
  
  icon                VARCHAR(50)        DEFAULT '',
  description         TEXT               DEFAULT '',
  
  achieved_at         TIMESTAMPTZ,
  
  created_at          TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

-- ── retirement_plans ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retirement_plans (
  id                            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                       UUID         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  current_age                   INT          NOT NULL CHECK (current_age > 0 AND current_age < 100),
  retirement_age                INT          NOT NULL CHECK (retirement_age > current_age AND retirement_age <= 100),
  life_expectancy               INT          NOT NULL CHECK (life_expectancy >= retirement_age),
  
  current_corpus                NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (current_corpus >= 0),
  target_corpus                 NUMERIC(15,2) NOT NULL CHECK (target_corpus > 0),
  
  monthly_contribution          NUMERIC(15,2) DEFAULT 0 CHECK (monthly_contribution >= 0),
  expected_return_pct           NUMERIC(5,2)  DEFAULT 10 CHECK (expected_return_pct >= 0),
  inflation_pct                 NUMERIC(5,2)  DEFAULT 6 CHECK (inflation_pct >= 0),
  
  monthly_expense_post_retirement NUMERIC(15,2) DEFAULT 0 CHECK (monthly_expense_post_retirement >= 0),
  
  projected_corpus              NUMERIC(15,2) DEFAULT 0 CHECK (projected_corpus >= 0),
  corpus_gap                    NUMERIC(15,2) DEFAULT 0,
  
  last_calculated_at            TIMESTAMPTZ   DEFAULT NOW(),
  created_at                    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── financial_health_scores ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_health_scores (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  overall_score         INT          NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  
  -- Component scores (0-100 each)
  net_worth_score       INT          DEFAULT 0 CHECK (net_worth_score >= 0 AND net_worth_score <= 100),
  savings_rate_score    INT          DEFAULT 0 CHECK (savings_rate_score >= 0 AND savings_rate_score <= 100),
  debt_score            INT          DEFAULT 0 CHECK (debt_score >= 0 AND debt_score <= 100),
  investment_score      INT          DEFAULT 0 CHECK (investment_score >= 0 AND investment_score <= 100),
  emergency_fund_score  INT          DEFAULT 0 CHECK (emergency_fund_score >= 0 AND emergency_fund_score <= 100),
  insurance_score       INT          DEFAULT 0 CHECK (insurance_score >= 0 AND insurance_score <= 100),
  goal_progress_score   INT          DEFAULT 0 CHECK (goal_progress_score >= 0 AND goal_progress_score <= 100),
  
  -- Insights
  strengths             TEXT[]       DEFAULT '{}',
  weaknesses            TEXT[]       DEFAULT '{}',
  recommendations       TEXT[]       DEFAULT '{}',
  
  calculated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── alerts ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id              UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  alert_type      alert_type_enum  NOT NULL,
  priority        alert_priority   NOT NULL DEFAULT 'medium',
  
  title           VARCHAR(255)     NOT NULL,
  message         TEXT             NOT NULL,
  
  action_url      VARCHAR(500)     DEFAULT '',
  action_label    VARCHAR(100)     DEFAULT '',
  
  is_read         BOOLEAN          NOT NULL DEFAULT FALSE,
  is_dismissed    BOOLEAN          NOT NULL DEFAULT FALSE,
  
  expires_at      TIMESTAMPTZ,
  
  metadata        JSONB            DEFAULT '{}',
  
  created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- ── ai_conversations ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_conversations (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  title       VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
  
  -- Conversation metadata
  message_count INT        DEFAULT 0,
  token_count   INT        DEFAULT 0,
  
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── ai_messages ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_messages (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID         NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  
  role              message_role NOT NULL,
  content           TEXT         NOT NULL,
  
  -- Token usage tracking
  prompt_tokens     INT          DEFAULT 0,
  completion_tokens INT          DEFAULT 0,
  total_tokens      INT          DEFAULT 0,
  
  -- Tool/function calls
  tool_calls        JSONB        DEFAULT '[]',
  tool_results      JSONB        DEFAULT '[]',
  
  -- Model metadata
  model             VARCHAR(100) DEFAULT '',
  
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_financial_profiles_user     ON financial_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_income_records_user         ON income_records(user_id);
CREATE INDEX IF NOT EXISTS idx_income_records_active       ON income_records(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_expense_records_user        ON expense_records(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_records_active      ON expense_records(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_expense_records_category    ON expense_records(category);
CREATE INDEX IF NOT EXISTS idx_loans_user                  ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status                ON loans(user_id, status);
CREATE INDEX IF NOT EXISTS idx_investments_user            ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_type            ON investments(investment_type);
CREATE INDEX IF NOT EXISTS idx_investments_active          ON investments(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_sips_user                   ON sips(user_id);
CREATE INDEX IF NOT EXISTS idx_sips_status                 ON sips(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sips_investment             ON sips(investment_id) WHERE investment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_user                 ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_type                 ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_goals_user                  ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status                ON goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_goals_target_date           ON goals(target_date);
CREATE INDEX IF NOT EXISTS idx_retirement_plans_user       ON retirement_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_health_user       ON financial_health_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_health_calculated ON financial_health_scores(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_user                 ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unread               ON alerts(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_alerts_created              ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user       ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated    ON ai_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation    ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created         ON ai_messages(created_at DESC);

-- ── Auto-update triggers ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TRIGGER trg_financial_profiles_updated
    BEFORE UPDATE ON financial_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_income_records_updated
    BEFORE UPDATE ON income_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_expense_records_updated
    BEFORE UPDATE ON expense_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_loans_updated
    BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_investments_updated
    BEFORE UPDATE ON investments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_sips_updated
    BEFORE UPDATE ON sips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_assets_updated
    BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_goals_updated
    BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_retirement_plans_updated
    BEFORE UPDATE ON retirement_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_ai_conversations_updated
    BEFORE UPDATE ON ai_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;
`;

async function migrate() {
  console.log("🔄 Running AI database migrations...");
  try {
    await db.query(SQL);
    console.log("✅ All AI tables created / verified successfully.\n");
    console.log("  New Tables:");
    console.log("    financial_profiles       — computed financial snapshot");
    console.log("    income_records           — income tracking (recurring + one-time)");
    console.log("    expense_records          — expense tracking (recurring + one-time)");
    console.log("    loans                    — loan management");
    console.log("    investments              — investment portfolio");
    console.log("    sips                     — SIP tracking");
    console.log("    assets                   — non-investment assets (savings, FD, gold, etc.)");
    console.log("    goals                    — financial goals");
    console.log("    retirement_plans         — retirement planning");
    console.log("    financial_health_scores  — health score tracking");
    console.log("    alerts                   — smart alerts & notifications");
    console.log("    ai_conversations         — AI chat conversations");
    console.log("    ai_messages              — AI chat messages");
    console.log("\n📊 Total: 13 new tables with proper relationships, indexes, and validations.");
    console.log("\nNext: Create model files for each table.\n");
  } catch (err) {
    console.error("❌ AI migration failed:", err.message);
    console.error(err);
  } finally {
    await db.pool.end();
  }
}

migrate();
