-- Combat / Initiative Tracker
CREATE TABLE mesh_combat_sessions (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      text        NOT NULL DEFAULT 'Combat',
  is_active                 boolean     NOT NULL DEFAULT false,
  created_by                uuid        NOT NULL REFERENCES mesh_users(id) ON DELETE CASCADE,
  round                     integer     NOT NULL DEFAULT 1,
  current_participant_index integer     NOT NULL DEFAULT 0,
  status                    text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'complete')),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mesh_combat_participants (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid        NOT NULL REFERENCES mesh_combat_sessions(id) ON DELETE CASCADE,
  display_name  text        NOT NULL,
  initiative    integer     NOT NULL DEFAULT 0,
  hp_current    integer     NOT NULL DEFAULT 0,
  hp_max        integer     NOT NULL DEFAULT 0,
  wound_state   integer     NOT NULL DEFAULT 0,
  is_npc        boolean     NOT NULL DEFAULT false,
  pc_sheet_id   uuid        REFERENCES mesh_pc_sheets(id) ON DELETE SET NULL,
  notes         text        NOT NULL DEFAULT '',
  sort_order    integer     NOT NULL DEFAULT 0
);

-- Auto-update updated_at on sessions
CREATE OR REPLACE FUNCTION update_combat_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER combat_session_updated_at
  BEFORE UPDATE ON mesh_combat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_combat_session_updated_at();

-- RLS: all authenticated users can read, only GMs can write sessions
ALTER TABLE mesh_combat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read combat sessions" ON mesh_combat_sessions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "gm insert combat sessions" ON mesh_combat_sessions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true));

CREATE POLICY "gm update combat sessions" ON mesh_combat_sessions
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true));

CREATE POLICY "gm delete combat sessions" ON mesh_combat_sessions
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true));

-- RLS: participants follow same pattern as sessions
ALTER TABLE mesh_combat_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read combat participants" ON mesh_combat_participants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "gm insert combat participants" ON mesh_combat_participants
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true));

CREATE POLICY "gm update combat participants" ON mesh_combat_participants
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true));

CREATE POLICY "gm delete combat participants" ON mesh_combat_participants
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE mesh_combat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE mesh_combat_participants;
