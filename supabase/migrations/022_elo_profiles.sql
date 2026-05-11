create table elo_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  elfname text not null,
  class text not null,
  rank integer default 1,
  title text,
  elfline text,
  corruption_stacks integer default 0,
  revive_sickness boolean default false,
  last_seen text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: users can read their own profile, GM can read/write all
alter table elo_profiles enable row level security;

create policy "Users can read own elo profile"
  on elo_profiles for select
  using (auth.uid() = user_id);

create policy "GM can manage all elo profiles"
  on elo_profiles for all
  using (
    exists (
      select 1 from mesh_users
      where mesh_users.id = auth.uid()
      and mesh_users.is_gm = true
    )
  )
  with check (
    exists (
      select 1 from mesh_users
      where mesh_users.id = auth.uid()
      and mesh_users.is_gm = true
    )
  );
