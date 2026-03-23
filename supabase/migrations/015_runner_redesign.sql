-- Migration 015: Flatline Runner Redesign
-- Adds career arc, act progression, boss state, crew, ghost memory, and run history columns.
-- All existing columns are preserved. Only additions — no drops, no changes to existing columns.

ALTER TABLE mesh_runner_state
  ADD COLUMN IF NOT EXISTS act               int     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS career_path       text,
  ADD COLUMN IF NOT EXISTS career_resources  jsonb   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS boss_state        jsonb   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS crew              jsonb   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ghost_memory_tree jsonb   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS run_history       jsonb   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS contacts          jsonb   NOT NULL DEFAULT '{}';
