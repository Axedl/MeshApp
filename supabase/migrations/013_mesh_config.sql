-- =============================================
-- MESH CONFIG
-- General key/value config table for GM-controlled
-- settings (signal strength, etc.).
-- =============================================

create table mesh_config (
  id         uuid        primary key default gen_random_uuid(),
  key        text        not null unique,
  value      text        not null,
  updated_at timestamptz not null default now()
);

alter table mesh_config enable row level security;

-- All authenticated users can read config (needed for client-side display)
create policy "Authenticated users read config"
  on mesh_config for select
  using (auth.uid() is not null);

-- GMs can update config values
create policy "GMs update config"
  on mesh_config for update
  using (
    exists (select 1 from mesh_users where id = auth.uid() and is_gm = true)
  );

-- Auto-update updated_at on change
create or replace function update_mesh_config_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger mesh_config_updated_at
  before update on mesh_config
  for each row
  execute function update_mesh_config_timestamp();

-- Seed initial values
insert into mesh_config (key, value) values
  ('signal_strength', '4')
on conflict (key) do nothing;

-- Enable realtime for live GM → client updates
alter publication supabase_realtime add table mesh_config;
