-- ============================================================
-- MESH PERSONAL TERMINAL — Chat Channels + Private DMs
-- Extends mesh_chat_messages with channel support
-- ============================================================

-- =========================
-- mesh_chat_channels
-- =========================
CREATE TABLE mesh_chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_dm boolean NOT NULL DEFAULT false,
  -- For DMs: exactly two user IDs
  dm_participants uuid[],
  created_by uuid NOT NULL REFERENCES mesh_users(id),
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mesh_chat_channels ENABLE ROW LEVEL SECURITY;

-- All authenticated users can see all channels (DMs will be filtered client-side)
CREATE POLICY "All authenticated users can read channels"
  ON mesh_chat_channels FOR SELECT
  TO authenticated
  USING (true);

-- GMs can create regular channels; any user can create a DM where they are a participant
CREATE POLICY "GMs create regular channels; users create DMs"
  ON mesh_chat_channels FOR INSERT
  TO authenticated
  WITH CHECK (
    (is_dm = false AND EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true))
    OR
    (is_dm = true AND auth.uid() = ANY(dm_participants))
  );

-- Only GMs can update channels (e.g. rename, archive)
CREATE POLICY "GMs can update channels"
  ON mesh_chat_channels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
  );

-- Only GMs can delete channels
CREATE POLICY "GMs can delete channels"
  ON mesh_chat_channels FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
  );

-- =========================
-- Add channel_id to mesh_chat_messages
-- =========================
ALTER TABLE mesh_chat_messages
  ADD COLUMN IF NOT EXISTS channel_id uuid REFERENCES mesh_chat_channels(id);

-- Enable realtime for channels table
ALTER PUBLICATION supabase_realtime ADD TABLE mesh_chat_channels;
