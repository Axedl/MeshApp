-- ============================================================
-- MESH PERSONAL TERMINAL — Hacking Minigame
-- mesh_hack_sessions: ICE-breaking minigame sessions
-- ============================================================

CREATE TABLE mesh_hack_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES mesh_users(id),
  assigned_to uuid REFERENCES mesh_users(id),
  name text NOT NULL,
  -- architecture: IceNode[]
  -- Each node: { id, name, difficulty (1-5), type, status: locked|breached|failed }
  architecture jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'pending', -- pending, active, complete, flatlined
  current_node_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mesh_hack_sessions ENABLE ROW LEVEL SECURITY;

-- GMs can fully manage all hack sessions
CREATE POLICY "GMs can manage all hack sessions"
  ON mesh_hack_sessions FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
  );

-- Assigned player can view their own session
CREATE POLICY "Assigned player can select their session"
  ON mesh_hack_sessions FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());

-- Assigned player can update their own session (e.g. breach nodes, status changes)
CREATE POLICY "Assigned player can update their session"
  ON mesh_hack_sessions FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION update_hack_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hack_sessions_updated_at
  BEFORE UPDATE ON mesh_hack_sessions
  FOR EACH ROW EXECUTE FUNCTION update_hack_session_timestamp();

-- Enable realtime so GM can watch runs live and player gets live updates
ALTER PUBLICATION supabase_realtime ADD TABLE mesh_hack_sessions;
