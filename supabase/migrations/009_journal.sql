-- GM Session Journal: private notes for game masters
CREATE TABLE mesh_journal_entries (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by   uuid        NOT NULL REFERENCES mesh_users(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  category     text        NOT NULL DEFAULT 'session' CHECK (category IN ('session', 'npc', 'location', 'faction', 'plot')),
  body         text        NOT NULL DEFAULT '',
  tags         text[]      NOT NULL DEFAULT '{}',
  updated_at   timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_journal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER journal_updated_at
  BEFORE UPDATE ON mesh_journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_journal_updated_at();

-- RLS: only the owner (GM) can read or write their own entries
ALTER TABLE mesh_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner reads own journal" ON mesh_journal_entries
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "owner inserts own journal" ON mesh_journal_entries
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "owner updates own journal" ON mesh_journal_entries
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "owner deletes own journal" ON mesh_journal_entries
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());
