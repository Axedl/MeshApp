-- ============================================================
-- MESH PERSONAL TERMINAL — Flatline Runner Incremental Game
-- mesh_runner_state: per-user game save state
-- ============================================================

CREATE TABLE mesh_runner_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES mesh_users(id) ON DELETE CASCADE UNIQUE,
  eddies bigint NOT NULL DEFAULT 0,
  rep int NOT NULL DEFAULT 0,
  -- upgrades: { [upgrade_id]: count }
  -- e.g. { "cheap_rig": 2, "stolen_icebreaker": 1 }
  upgrades jsonb NOT NULL DEFAULT '{}',
  last_tick timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mesh_runner_state ENABLE ROW LEVEL SECURITY;

-- Players manage their own state only
CREATE POLICY "Users manage own runner state"
  ON mesh_runner_state FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- GMs can view all runner states (for oversight)
CREATE POLICY "GMs can read all runner states"
  ON mesh_runner_state FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
  );
