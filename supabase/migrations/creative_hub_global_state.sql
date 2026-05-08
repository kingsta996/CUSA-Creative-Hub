-- ─────────────────────────────────────────────────────────────────────────
-- Migration: Creative Hub global state + roles + save requests
--
-- Adds a per-page global (shared) state table on top of the existing
-- per-user creative_hub_state. Adds a `role` column to creative_hub_users
-- and seeds Dane Lewis + Addison Franklin. Adds a save-requests queue so
-- Josh's championship "request promotion to global" workflow can land.
--
-- Permission resolution lives in client JS (cusa-page.js); this migration
-- only adds the storage. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────

-- 1. role on creative_hub_users.
--    'admin'       — Keith. Override tool + everything.
--    'positioning' — Addison. Global save with positioning-scope on
--                     pages where scope splits, all-scope elsewhere.
--    'editor'      — Dane / Josh / future. Local save by default;
--                     specific pages can promote to global per matrix.
alter table creative_hub_users add column if not exists role text default 'editor';

-- Promote Keith + Addison to their roles (idempotent).
update creative_hub_users set role = 'admin'
 where email = 'kking@conferenceusa.com';
update creative_hub_users set role = 'positioning'
 where email = 'afranklin@conferenceusa.com';

-- 2. Seed new editors.
--    Dane Lewis — content lead. Hash = SHA-256('C0nferenceUSA!').
--    Addison Franklin — global admin (positioning role). Same default pw.
insert into creative_hub_users (email, pw_hash, display_name, role) values
  ('dlewis@conferenceusa.com',    '8b0bc1004fe02329dc00733a3be4ee41e8539e929ec9f7d1e858906a676f4f47', 'Dane Lewis',       'editor'),
  ('afranklin@conferenceusa.com', '8b0bc1004fe02329dc00733a3be4ee41e8539e929ec9f7d1e858906a676f4f47', 'Addison Franklin', 'positioning')
on conflict (email) do update set
  pw_hash      = excluded.pw_hash,
  display_name = excluded.display_name,
  role         = excluded.role,
  is_active    = true;

-- 3. Per-page global state (one row per page_key — last writer wins).
--    Read by every signed-in user on page load; written by users whose
--    permission matrix entry says mode='global' for that page.
create table if not exists creative_hub_global_state (
  page_key text primary key,
  state jsonb not null,
  updated_at timestamptz default now(),
  updated_by_email text
);
alter table creative_hub_global_state enable row level security;
drop policy if exists "public read global state"  on creative_hub_global_state;
drop policy if exists "public write global state" on creative_hub_global_state;
create policy "public read global state"  on creative_hub_global_state for select using (true);
create policy "public write global state" on creative_hub_global_state for all    using (true) with check (true);

create index if not exists creative_hub_global_state_updated_at_idx
  on creative_hub_global_state (updated_at desc);

-- 4. Save-promotion request queue. Used by users in 'request-global' mode
--    (Josh on Championship). They write to local first, then submit a
--    request — Keith reviews + approves in the override tool, which
--    promotes the local snapshot into creative_hub_global_state.
create table if not exists creative_hub_save_requests (
  id uuid primary key default gen_random_uuid(),
  page_key text not null,
  requester_email text not null,
  state jsonb not null,
  requested_at timestamptz default now(),
  status text default 'pending',         -- 'pending' | 'approved' | 'rejected'
  processed_by_email text,
  processed_at timestamptz,
  note text
);
alter table creative_hub_save_requests enable row level security;
drop policy if exists "public read save requests"  on creative_hub_save_requests;
drop policy if exists "public write save requests" on creative_hub_save_requests;
create policy "public read save requests"  on creative_hub_save_requests for select using (true);
create policy "public write save requests" on creative_hub_save_requests for all    using (true) with check (true);

create index if not exists creative_hub_save_requests_pending_idx
  on creative_hub_save_requests (status, requested_at desc);

-- 5. Realtime publication adds so the override tool + future "live edit"
--    indicators can subscribe.
do $$ begin
  alter publication supabase_realtime add table creative_hub_global_state;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table creative_hub_save_requests;
exception when duplicate_object then null; end $$;

-- 6. Sanity check.
select email, display_name, role, is_active
  from creative_hub_users
  order by case role when 'admin' then 0 when 'positioning' then 1 else 2 end, email;
