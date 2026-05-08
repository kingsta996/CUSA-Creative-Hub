-- ─────────────────────────────────────────────────────────────────────────
-- Migration: creative_hub_users + creative_hub_state
-- Adds per-user login + per-user editor state for cusa-creative-hub editor
-- pages (matchup, matchup-final, matchup-grid, championship,
-- championship-game-day, potw). Independent of admin_users (Production Hub)
-- — Creative Hub editors are a separate user list.
--
-- Runs in the same Supabase project as the Production Hub tables so the
-- admin override tool in admin.html can read/write creative_hub_state.
--
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Per-user Creative Hub editors. SHA-256 of password, matches the
--    pattern used by admin_users.
create table if not exists creative_hub_users (
  email text primary key,
  pw_hash text not null,
  display_name text,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table creative_hub_users enable row level security;
drop policy if exists "public read creative hub users"  on creative_hub_users;
drop policy if exists "public write creative hub users" on creative_hub_users;
create policy "public read creative hub users"  on creative_hub_users for select using (true);
create policy "public write creative hub users" on creative_hub_users for all    using (true) with check (true);

-- 2. Per-user editor state. One row per (email, page_key). page_key is the
--    page filename without extension: 'matchup', 'matchup-final',
--    'matchup-grid', 'championship', 'championship-game-day', 'potw'.
--    state is the JSON blob each page used to write to localStorage.
create table if not exists creative_hub_state (
  email text not null,
  page_key text not null,
  state jsonb not null,
  updated_at timestamptz default now(),
  primary key (email, page_key)
);

create index if not exists creative_hub_state_updated_at_idx
  on creative_hub_state (updated_at desc);

alter table creative_hub_state enable row level security;
drop policy if exists "public read creative hub state"  on creative_hub_state;
drop policy if exists "public write creative hub state" on creative_hub_state;
create policy "public read creative hub state"  on creative_hub_state for select using (true);
create policy "public write creative hub state" on creative_hub_state for all    using (true) with check (true);

-- 3. Seed editors.
--    kking@conferenceusa.com  → SHA-256('12nolimitsonUS!') — Keith's existing
--                                Production Hub admin password (where he
--                                signs in via the legacy-fallback path).
--    jyonis@conferenceusa.com → SHA-256('C0nferenceUSA!').
insert into creative_hub_users (email, pw_hash, display_name) values
  ('kking@conferenceusa.com',    '9a874f8b06ebb0eb63336db78b70ca149513a237de8395d8e858ee8f0c702ae2', 'Keith King'),
  ('jyonis@conferenceusa.com',   '8b0bc1004fe02329dc00733a3be4ee41e8539e929ec9f7d1e858906a676f4f47', 'Josh Yonis')
on conflict (email) do update set
  pw_hash      = excluded.pw_hash,
  display_name = excluded.display_name,
  is_active    = true;

-- One-time cleanup: an earlier version of this migration seeded Keith's row
-- under the wrong email (keithmkingjr@gmail.com). Move any state he saved
-- under it to kking@conferenceusa.com, then drop the old row. Safe to run
-- on a fresh DB (no rows match → no-op).
update creative_hub_state
   set email = 'kking@conferenceusa.com'
 where email = 'keithmkingjr@gmail.com';
delete from creative_hub_users
 where email = 'keithmkingjr@gmail.com';

-- 4. Realtime publication so the override tool in admin.html can stream
--    state changes if it subscribes.
do $$ begin
  alter publication supabase_realtime add table creative_hub_users;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table creative_hub_state;
exception when duplicate_object then null; end $$;

-- 5. Sanity check — should return 2 editors.
select email, display_name, is_active, created_at from creative_hub_users order by created_at;
