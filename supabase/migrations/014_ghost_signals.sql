-- =============================================
-- GHOST SIGNALS
-- GM-authored ambient message fragments that
-- appear as atmospheric overlays in the terminal.
-- =============================================

create table mesh_ghost_signals (
  id         uuid        primary key default gen_random_uuid(),
  content    text        not null,
  active     boolean     not null default true,
  created_at timestamptz not null default now()
);

alter table mesh_ghost_signals enable row level security;

-- All authenticated users can read (needed for client-side display)
create policy "Authenticated users read ghost signals"
  on mesh_ghost_signals for select
  using (auth.uid() is not null);

-- GMs can create ghost signals
create policy "GMs insert ghost signals"
  on mesh_ghost_signals for insert
  with check (
    exists (select 1 from mesh_users where id = auth.uid() and is_gm = true)
  );

-- GMs can toggle active state (no deletes by design)
create policy "GMs update ghost signals"
  on mesh_ghost_signals for update
  using (
    exists (select 1 from mesh_users where id = auth.uid() and is_gm = true)
  );

-- Enable realtime so clients receive activations instantly
alter publication supabase_realtime add table mesh_ghost_signals;
