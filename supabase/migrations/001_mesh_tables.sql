-- ============================================================
-- MESH PERSONAL TERMINAL — Database Schema
-- Cyberpunk RED Campaign App
-- ============================================================

-- =========================
-- mesh_users
-- =========================
CREATE TABLE IF NOT EXISTS mesh_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle text UNIQUE NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT '',
  colour_scheme text NOT NULL DEFAULT 'green',
  is_gm boolean NOT NULL DEFAULT false,
  is_online boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mesh_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all mesh_users"
  ON mesh_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own row"
  ON mesh_users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own row"
  ON mesh_users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- =========================
-- mesh_npc_identities
-- =========================
CREATE TABLE IF NOT EXISTS mesh_npc_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT '',
  description text,
  created_by uuid NOT NULL REFERENCES mesh_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mesh_npc_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read NPCs"
  ON mesh_npc_identities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only GMs can insert NPCs"
  ON mesh_npc_identities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
  );

CREATE POLICY "Only GMs can update NPCs"
  ON mesh_npc_identities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
  );

CREATE POLICY "Only GMs can delete NPCs"
  ON mesh_npc_identities FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
  );

-- =========================
-- mesh_emails
-- =========================
CREATE TABLE IF NOT EXISTS mesh_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES mesh_users(id),
  from_npc_id uuid REFERENCES mesh_npc_identities(id),
  to_user_id uuid NOT NULL REFERENCES mesh_users(id),
  subject text NOT NULL,
  body text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  reply_to_id uuid REFERENCES mesh_emails(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Exactly one of from_user_id or from_npc_id must be set
  CONSTRAINT email_sender_check CHECK (
    (from_user_id IS NOT NULL AND from_npc_id IS NULL) OR
    (from_user_id IS NULL AND from_npc_id IS NOT NULL)
  )
);

ALTER TABLE mesh_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read emails sent to or from them"
  ON mesh_emails FOR SELECT
  TO authenticated
  USING (to_user_id = auth.uid() OR from_user_id = auth.uid());

CREATE POLICY "Users can insert emails from themselves"
  ON mesh_emails FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()
    OR (
      from_npc_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
    )
  );

CREATE POLICY "Users can mark their received emails as read"
  ON mesh_emails FOR UPDATE
  TO authenticated
  USING (to_user_id = auth.uid())
  WITH CHECK (to_user_id = auth.uid());

-- =========================
-- mesh_chat_messages
-- =========================
CREATE TABLE IF NOT EXISTS mesh_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES mesh_users(id),
  from_npc_id uuid REFERENCES mesh_npc_identities(id),
  message text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mesh_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read chat"
  ON mesh_chat_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own chat messages"
  ON mesh_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()
    OR (
      from_npc_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
    )
    OR (
      is_system = true
      AND EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
    )
  );

-- =========================
-- mesh_net_content
-- =========================
CREATE TABLE IF NOT EXISTS mesh_net_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  source_name text NOT NULL DEFAULT 'Unknown Source',
  tags text[] DEFAULT '{}',
  search_vector tsvector,
  visible_to uuid[],
  created_by uuid NOT NULL REFERENCES mesh_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-generate search_vector
CREATE OR REPLACE FUNCTION mesh_net_content_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.body, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mesh_net_content_search_update
  BEFORE INSERT OR UPDATE ON mesh_net_content
  FOR EACH ROW
  EXECUTE FUNCTION mesh_net_content_search_vector_update();

CREATE INDEX IF NOT EXISTS mesh_net_content_search_idx ON mesh_net_content USING gin(search_vector);

ALTER TABLE mesh_net_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read visible net content"
  ON mesh_net_content FOR SELECT
  TO authenticated
  USING (
    visible_to IS NULL OR auth.uid() = ANY(visible_to)
  );

CREATE POLICY "Only GMs can insert net content"
  ON mesh_net_content FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
  );

CREATE POLICY "Only GMs can update net content"
  ON mesh_net_content FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
  );

CREATE POLICY "Only GMs can delete net content"
  ON mesh_net_content FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
  );

-- =========================
-- mesh_contacts
-- =========================
CREATE TABLE IF NOT EXISTS mesh_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES mesh_users(id) ON DELETE CASCADE,
  npc_id uuid NOT NULL REFERENCES mesh_npc_identities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, npc_id)
);

ALTER TABLE mesh_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own contacts"
  ON mesh_contacts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Only GMs can insert contacts"
  ON mesh_contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
  );

CREATE POLICY "Only GMs can delete contacts"
  ON mesh_contacts FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
  );

-- =========================
-- mesh_files
-- =========================
CREATE TABLE IF NOT EXISTS mesh_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES mesh_users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  content_type text NOT NULL DEFAULT 'text/plain',
  content_text text,
  storage_path text,
  source text NOT NULL DEFAULT 'Personal',
  is_new boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mesh_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own files"
  ON mesh_files FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert their own files"
  ON mesh_files FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true)
  );

CREATE POLICY "Users can update their own files"
  ON mesh_files FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete their own files"
  ON mesh_files FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- =========================
-- Enable Realtime for mesh tables
-- =========================
ALTER PUBLICATION supabase_realtime ADD TABLE mesh_emails;
ALTER PUBLICATION supabase_realtime ADD TABLE mesh_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE mesh_files;
ALTER PUBLICATION supabase_realtime ADD TABLE mesh_contacts;
