-- Player replies on forum-style net content posts
ALTER TABLE mesh_net_content
  ADD COLUMN IF NOT EXISTS is_forum boolean NOT NULL DEFAULT false;

CREATE TABLE mesh_net_replies (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id   uuid        NOT NULL REFERENCES mesh_net_content(id) ON DELETE CASCADE,
  from_user_id uuid        NOT NULL REFERENCES mesh_users(id) ON DELETE CASCADE,
  body         text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mesh_net_replies ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read replies
CREATE POLICY "Users read replies"
  ON mesh_net_replies FOR SELECT TO authenticated
  USING (true);

-- Users can insert their own replies
CREATE POLICY "Users insert own replies"
  ON mesh_net_replies FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid());

-- GMs can delete any reply (moderation)
CREATE POLICY "GMs delete replies"
  ON mesh_net_replies FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM mesh_users WHERE id = auth.uid() AND is_gm = true));

ALTER PUBLICATION supabase_realtime ADD TABLE mesh_net_replies;
