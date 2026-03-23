-- =============================================
-- IN-GAME CLOCK
-- Adds ingame_date and ingame_time rows to mesh_config.
-- GM-controlled via GMControlsPanel; all clients subscribe
-- via realtime to stay in sync.
-- =============================================

-- Seed default values. GMControlsPanel uses UPDATE (not INSERT/upsert),
-- so no additional RLS policy is needed beyond the one in migration 013.
insert into mesh_config (key, value) values
  ('ingame_date', '2046-01-17'),
  ('ingame_time', '14:32')
on conflict (key) do nothing;
