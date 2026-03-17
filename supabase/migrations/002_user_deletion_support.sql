-- ============================================================
-- MESH PERSONAL TERMINAL — Migration 002
-- User Deletion Support: Fix FK constraints for cascading deletes
--
-- When a GM deletes a user via the delete-user edge function,
-- auth.users DELETE cascades to mesh_users (already set up).
-- The tables below reference mesh_users but had no ON DELETE
-- action (defaulting to RESTRICT), which would block deletion.
-- ============================================================

-- -----------------------------------------------
-- mesh_emails: from_user_id → SET NULL on delete
--   Preserves email history; sender becomes anonymous.
-- mesh_emails: to_user_id → CASCADE on delete
--   Deletes inbox entries for the removed user.
-- -----------------------------------------------
ALTER TABLE mesh_emails
  DROP CONSTRAINT mesh_emails_from_user_id_fkey,
  ADD CONSTRAINT mesh_emails_from_user_id_fkey
    FOREIGN KEY (from_user_id) REFERENCES mesh_users(id) ON DELETE SET NULL;

ALTER TABLE mesh_emails
  DROP CONSTRAINT mesh_emails_to_user_id_fkey,
  ADD CONSTRAINT mesh_emails_to_user_id_fkey
    FOREIGN KEY (to_user_id) REFERENCES mesh_users(id) ON DELETE CASCADE;

-- -----------------------------------------------
-- mesh_chat_messages: from_user_id → SET NULL on delete
--   Preserves chat history; author becomes anonymous.
-- -----------------------------------------------
ALTER TABLE mesh_chat_messages
  DROP CONSTRAINT mesh_chat_messages_from_user_id_fkey,
  ADD CONSTRAINT mesh_chat_messages_from_user_id_fkey
    FOREIGN KEY (from_user_id) REFERENCES mesh_users(id) ON DELETE SET NULL;

-- -----------------------------------------------
-- mesh_net_content: created_by → SET NULL on delete
--   GMs are rarely deleted, but handle it gracefully.
--   Column must be made nullable first.
-- -----------------------------------------------
ALTER TABLE mesh_net_content
  ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE mesh_net_content
  DROP CONSTRAINT mesh_net_content_created_by_fkey,
  ADD CONSTRAINT mesh_net_content_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES mesh_users(id) ON DELETE SET NULL;
