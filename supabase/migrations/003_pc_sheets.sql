-- PC Sheets for Cyberpunk RED characters
CREATE TABLE mesh_pc_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES mesh_users(id) ON DELETE CASCADE,

  -- Identity
  handle TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  reputation SMALLINT NOT NULL DEFAULT 0,

  -- Stats (0-10)
  stat_int  SMALLINT NOT NULL DEFAULT 0,
  stat_ref  SMALLINT NOT NULL DEFAULT 0,
  stat_dex  SMALLINT NOT NULL DEFAULT 0,
  stat_tech SMALLINT NOT NULL DEFAULT 0,
  stat_cool SMALLINT NOT NULL DEFAULT 0,
  stat_will SMALLINT NOT NULL DEFAULT 0,
  stat_luck SMALLINT NOT NULL DEFAULT 0,
  stat_move SMALLINT NOT NULL DEFAULT 0,
  stat_body SMALLINT NOT NULL DEFAULT 0,
  stat_emp  SMALLINT NOT NULL DEFAULT 0,

  -- Derived / tracked values
  hp_current       SMALLINT NOT NULL DEFAULT 0,
  hp_max           SMALLINT NOT NULL DEFAULT 0,
  humanity_current SMALLINT NOT NULL DEFAULT 0,

  -- Wound state: 0=Uninjured 1=Lightly Wounded 2=Seriously Wounded 3=Critically Wounded 4=Mortally Wounded 5=Dead
  wound_state SMALLINT NOT NULL DEFAULT 0,

  -- Free-form JSONB lists
  -- skills:   [{name: string, level: number, stat: string}]
  -- cyberware: [{name: string, humanity_cost: number, notes: string}]
  -- weapons:  [{name: string, damage: string, rof: number, notes: string}]
  -- gear:     [{name: string, notes: string}]
  skills    JSONB NOT NULL DEFAULT '[]',
  cyberware JSONB NOT NULL DEFAULT '[]',
  weapons   JSONB NOT NULL DEFAULT '[]',
  gear      JSONB NOT NULL DEFAULT '[]',

  notes TEXT NOT NULL DEFAULT '',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One sheet per player (can be relaxed later for multi-character campaigns)
CREATE UNIQUE INDEX mesh_pc_sheets_owner_unique ON mesh_pc_sheets (owner_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_pc_sheet_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pc_sheets_updated_at
  BEFORE UPDATE ON mesh_pc_sheets
  FOR EACH ROW EXECUTE FUNCTION update_pc_sheet_timestamp();

-- RLS
ALTER TABLE mesh_pc_sheets ENABLE ROW LEVEL SECURITY;

-- Owners can fully manage their own sheet
CREATE POLICY "Owner manages own sheet"
  ON mesh_pc_sheets
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- GMs can read all sheets
CREATE POLICY "GMs read all sheets"
  ON mesh_pc_sheets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mesh_users
      WHERE id = auth.uid() AND is_gm = true
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE mesh_pc_sheets;
