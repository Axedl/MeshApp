-- Migration 016: Add career_branch and job_sequence_step columns
-- These were missing from 015 and are required for correct save/load across sessions.

ALTER TABLE mesh_runner_state
  ADD COLUMN IF NOT EXISTS career_branch       text,
  ADD COLUMN IF NOT EXISTS job_sequence_step   int     NOT NULL DEFAULT 0;
