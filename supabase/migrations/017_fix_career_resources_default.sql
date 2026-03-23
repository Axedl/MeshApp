-- Migration 017: Fix career_resources default and backfill existing rows
-- Migration 015 set the default to '{}', but the app expects at least { "secondary": 0 }.
-- Empty objects survive the TypeScript ?? fallback (truthy), causing NaN in calcInfluenceGenRate.

-- Backfill rows that have an empty object
UPDATE mesh_runner_state
  SET career_resources = '{"secondary": 0}'
  WHERE career_resources = '{}';

-- Update column default for future rows
ALTER TABLE mesh_runner_state
  ALTER COLUMN career_resources SET DEFAULT '{"secondary": 0}';
