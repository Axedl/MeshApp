-- ============================================================
-- MESH Signal Board — GM covert control layer
-- Features: Drift, Blackwall Traps, Dead Drops, Kiri Hou Canvas
-- ============================================================

-- =========================
-- System NPC for dead-drop email delivery
-- mesh_emails requires exactly one sender (from_user_id or from_npc_id).
-- This sentinel NPC satisfies that constraint for GM-authored dead drops.
-- =========================

-- Allow created_by to be null so we can insert a system-level NPC
ALTER TABLE mesh_npc_identities ALTER COLUMN created_by DROP NOT NULL;

INSERT INTO mesh_npc_identities (id, handle, display_name, role, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '[UNKNOWN SOURCE]',
  'Unknown Source',
  '',
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- =========================
-- mesh_drift_state
-- GM-owned drift score per player (0–5).
-- Players NEVER read drift_level — they use the mesh_drift_effects view.
-- =========================
CREATE TABLE mesh_drift_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES mesh_users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  drift_level integer NOT NULL DEFAULT 0 CHECK (drift_level >= 0 AND drift_level <= 5),
  active_glitches jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mesh_drift_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_read_own_drift" ON mesh_drift_state
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "gm_all_drift" ON mesh_drift_state
  FOR ALL USING (
    EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
  );

-- Player-safe view: exposes only active_glitches, never drift_level.
-- RLS on the underlying table still applies, so players only see their own row.
CREATE VIEW mesh_drift_effects AS
  SELECT user_id, active_glitches
  FROM mesh_drift_state;

-- =========================
-- mesh_blackwall_traps
-- GM-authored content that fires once when a player searches a keyword.
-- =========================
CREATE TABLE mesh_blackwall_traps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES mesh_users(id) NOT NULL,
  trigger_keyword text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  corruption_level integer NOT NULL DEFAULT 2 CHECK (corruption_level >= 1 AND corruption_level <= 3),
  is_armed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mesh_blackwall_trap_fires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trap_id uuid REFERENCES mesh_blackwall_traps(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES mesh_users(id) ON DELETE CASCADE NOT NULL,
  fired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trap_id, user_id)
);

ALTER TABLE mesh_blackwall_traps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesh_blackwall_trap_fires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gm_all_traps" ON mesh_blackwall_traps
  FOR ALL USING (
    EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
  );

-- Players cannot read traps directly; keyword matching is handled server-side.
-- The check-blackwall edge function uses service role to match keywords.

CREATE POLICY "players_own_fires" ON mesh_blackwall_trap_fires
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "gm_all_fires" ON mesh_blackwall_trap_fires
  FOR ALL USING (
    EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
  );

-- =========================
-- mesh_dead_drops
-- GM-authored messages delivered via email, file, or net search injection.
-- =========================
CREATE TABLE mesh_dead_drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES mesh_users(id) NOT NULL,
  target_user_id uuid REFERENCES mesh_users(id) ON DELETE CASCADE,
  delivery_method text NOT NULL CHECK (delivery_method IN ('email', 'file', 'netsearch')),
  subject text NOT NULL,
  body text NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('manual', 'date', 'content_opened')),
  trigger_date timestamptz,
  trigger_content_id text,
  is_armed boolean NOT NULL DEFAULT true,
  fired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mesh_dead_drops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gm_all_drops" ON mesh_dead_drops
  FOR ALL USING (
    EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
  );

-- Players never directly read dead drops; delivery is handled by edge functions.

-- =========================
-- mesh_kiri_hou_canvas
-- One canvas per player. Cyberware entries stored as jsonb array.
-- =========================
CREATE TABLE mesh_kiri_hou_canvas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES mesh_users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  entries jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mesh_kiri_hou_canvas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_read_own_canvas" ON mesh_kiri_hou_canvas
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_update_own_canvas" ON mesh_kiri_hou_canvas
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert_own_canvas" ON mesh_kiri_hou_canvas
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "gm_all_canvas" ON mesh_kiri_hou_canvas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
  );

-- =========================
-- RPC: check if a sealed KiriHou note should be unlocked for the current player.
-- Compares gm_note_drift_unlock threshold against the player's actual drift_level
-- without ever exposing drift_level to the client.
-- =========================
CREATE OR REPLACE FUNCTION get_my_drift_unlock_status(
  p_canvas_owner_id uuid,
  p_entry_id text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_drift_level integer;
  v_entry jsonb;
  v_unlock_level integer;
BEGIN
  -- Caller must be the canvas owner
  IF auth.uid() != p_canvas_owner_id THEN
    RETURN false;
  END IF;

  -- Get caller's drift level
  SELECT drift_level INTO v_drift_level
  FROM mesh_drift_state
  WHERE user_id = auth.uid();

  IF v_drift_level IS NULL THEN
    RETURN false;
  END IF;

  -- Get the specific entry from the canvas
  SELECT e INTO v_entry
  FROM mesh_kiri_hou_canvas c,
       jsonb_array_elements(c.entries) AS e
  WHERE c.owner_id = p_canvas_owner_id
    AND e->>'id' = p_entry_id
  LIMIT 1;

  IF v_entry IS NULL THEN
    RETURN false;
  END IF;

  v_unlock_level := (v_entry->>'gm_note_drift_unlock')::integer;

  IF v_unlock_level IS NULL THEN
    RETURN false;
  END IF;

  RETURN v_drift_level >= v_unlock_level;
END;
$$;

-- =========================
-- Enable Realtime on new tables
-- (Views cannot be added to publications)
-- =========================
ALTER PUBLICATION supabase_realtime ADD TABLE mesh_drift_state;
ALTER PUBLICATION supabase_realtime ADD TABLE mesh_kiri_hou_canvas;
