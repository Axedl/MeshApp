-- Fix DM privacy: replace open read policy with participant-scoped policy
DROP POLICY IF EXISTS "All authenticated users can read channels" ON mesh_chat_channels;

CREATE POLICY "Users can read channels they belong to"
  ON mesh_chat_channels FOR SELECT
  TO authenticated
  USING (
    is_dm = false
    OR (is_dm = true AND auth.uid() = ANY(dm_participants))
  );
