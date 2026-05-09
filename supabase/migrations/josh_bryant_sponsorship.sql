-- ─────────────────────────────────────────────────────────────────────────
-- Migration: Josh Bryant (jbryant@conferenceusa.com) — primary sponsorship
-- editor for the Media Day rundown. Gets `editor` role on creative_hub_users
-- and `mode: 'global'` for media-day in PAGE_PERMS (cusa-page.js, separate
-- commit) so his sponsorship saves go straight to the master rundown.
--
-- Default password = C0nferenceUSA! (same hash as Dane / Josh Yonis / Mike).
-- Idempotent.
-- ─────────────────────────────────────────────────────────────────────────

insert into creative_hub_users (email, pw_hash, display_name, role) values
  ('jbryant@conferenceusa.com', '8b0bc1004fe02329dc00733a3be4ee41e8539e929ec9f7d1e858906a676f4f47', 'Josh Bryant', 'editor')
on conflict (email) do update set
  pw_hash      = excluded.pw_hash,
  display_name = excluded.display_name,
  is_active    = true;

select email, display_name, role, is_active
  from creative_hub_users
  order by case role when 'admin' then 0 when 'positioning' then 1 else 2 end, email;
