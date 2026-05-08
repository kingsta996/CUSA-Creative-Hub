-- ─────────────────────────────────────────────────────────────────────────
-- Migration: Mike Watts user + Media Day rundown permissions
--
-- Adds Mike (JW Productions) to creative_hub_users so he can sign in to the
-- shared CUSA Supabase auth and edit the Media Day production rundown
-- (mode='request-global' — he can edit + submit save requests; Keith
-- approves them in the override tool to promote to global).
--
-- The page permissions matrix lives in client JS (cusa-page.js); this
-- migration only adds the user. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────

-- Mike Watts (JW Productions) — production company access. SHA-256 of
-- ESPN_rundown2026 = 257cf814782c07cb92c913fa33294c0b19836b6e6300462f4ffabaa04bae9de2.
insert into creative_hub_users (email, pw_hash, display_name, role) values
  ('mike@jwproductions.org', '257cf814782c07cb92c913fa33294c0b19836b6e6300462f4ffabaa04bae9de2', 'Mike Watts (JW Productions)', 'editor')
on conflict (email) do update set
  pw_hash      = excluded.pw_hash,
  display_name = excluded.display_name,
  is_active    = true;

-- Sanity check — should now return 5 users.
select email, display_name, role, is_active
  from creative_hub_users
  order by case role when 'admin' then 0 when 'positioning' then 1 else 2 end, email;
