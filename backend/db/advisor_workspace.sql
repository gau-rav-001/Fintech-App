-- Existing rows remain valid. Expand the planning categories for new guidance.
ALTER TABLE advisor_recommendations DROP CONSTRAINT IF EXISTS advisor_recommendations_category_check;
ALTER TABLE advisor_recommendations ADD CONSTRAINT advisor_recommendations_category_check
  CHECK (category IN ('investment','retirement','debt','insurance','emergency_fund','tax','budget','expenses','goal','risk'));
ALTER TABLE advisor_recommendations
  ADD COLUMN IF NOT EXISTS assumptions TEXT,
  ADD COLUMN IF NOT EXISTS risk_disclosure TEXT,
  ADD COLUMN IF NOT EXISTS follow_up TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_completed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS advisor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  closed BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (ends_at >= starts_at + interval '15 minutes' AND ends_at <= starts_at + interval '120 minutes')
);
CREATE INDEX IF NOT EXISTS idx_advisor_available ON advisor_availability(advisor_id, starts_at) WHERE NOT closed;
