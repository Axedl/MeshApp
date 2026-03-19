-- =============================================
-- CAMPAIGNS
-- GMs create and manage campaigns; players are
-- assigned to a campaign via campaign_id on their
-- profile and PC sheet (GM-only write).
-- =============================================

-- =============================================
-- 1. campaigns table
-- =============================================

create table campaigns (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  description text,
  gm_user_id  uuid        references auth.users(id) on delete set null,
  active      boolean     not null default true,
  created_at  timestamptz not null default now()
);

alter table campaigns enable row level security;

-- All authenticated users can read campaigns
-- (players need this to see their own assignment)
create policy "Authenticated users read campaigns"
  on campaigns for select
  using (auth.uid() is not null);

-- GMs can create campaigns
create policy "GMs insert campaigns"
  on campaigns for insert
  with check (
    exists (select 1 from mesh_users where id = auth.uid() and is_gm = true)
  );

-- GMs can update campaigns
create policy "GMs update campaigns"
  on campaigns for update
  using (
    exists (select 1 from mesh_users where id = auth.uid() and is_gm = true)
  );

-- =============================================
-- 2. Add campaign_id to mesh_users
-- =============================================

alter table mesh_users
  add column campaign_id uuid references campaigns(id) on delete set null;

-- GMs can update any user profile row (to assign campaign_id)
create policy "GMs update user profiles"
  on mesh_users for update
  using (
    exists (select 1 from mesh_users where id = auth.uid() and is_gm = true)
  );

-- =============================================
-- 3. Add campaign_id to mesh_pc_sheets
-- =============================================

alter table mesh_pc_sheets
  add column campaign_id uuid references campaigns(id) on delete set null;

-- GMs can update any PC sheet row (to assign campaign_id)
create policy "GMs update pc sheets"
  on mesh_pc_sheets for update
  using (
    exists (select 1 from mesh_users where id = auth.uid() and is_gm = true)
  );

-- =============================================
-- 4. Protect campaign_id from player modification
--
-- Existing UPDATE policies on mesh_users and
-- mesh_pc_sheets are broad (owners can update
-- their own row). Since those cannot be modified,
-- a BEFORE UPDATE trigger reverts any campaign_id
-- change attempted by a non-GM.
-- =============================================

create or replace function protect_campaign_id()
returns trigger language plpgsql security definer as $$
begin
  if exists (select 1 from mesh_users where id = auth.uid() and is_gm = true) then
    return new;
  end if;
  -- Non-GM: silently revert campaign_id to its current value
  new.campaign_id := old.campaign_id;
  return new;
end;
$$;

create trigger enforce_campaign_id_on_users
  before update on mesh_users
  for each row
  when (new.campaign_id is distinct from old.campaign_id)
  execute function protect_campaign_id();

create trigger enforce_campaign_id_on_pc_sheets
  before update on mesh_pc_sheets
  for each row
  when (new.campaign_id is distinct from old.campaign_id)
  execute function protect_campaign_id();
