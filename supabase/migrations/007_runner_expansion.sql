-- ============================================================
-- MESH PERSONAL TERMINAL — Flatline Runner Expansion
-- Adds prestige system, multiplier upgrades, milestones, events
-- ============================================================

ALTER TABLE mesh_runner_state
  ADD COLUMN IF NOT EXISTS prestige_tokens    int     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prestige_count     int     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prestige_upgrades  jsonb   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lifetime_eddies    bigint  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS milestones_claimed jsonb   NOT NULL DEFAULT '[]';

-- Backfill lifetime_eddies from current eddies for existing rows
UPDATE mesh_runner_state SET lifetime_eddies = eddies WHERE lifetime_eddies = 0;
