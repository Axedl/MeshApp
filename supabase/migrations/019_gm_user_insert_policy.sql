-- ============================================================
-- Allow GMs to insert mesh_users profiles on behalf of new users
-- Fixes RLS violation when GM creates a user via UserManagement
-- ============================================================

create policy "GMs can insert user profiles"
  on mesh_users for insert
  to authenticated
  with check (
    exists (select 1 from mesh_users where id = auth.uid() and is_gm = true)
  );
