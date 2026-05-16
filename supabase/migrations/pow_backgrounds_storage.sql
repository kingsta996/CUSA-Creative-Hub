-- ─────────────────────────────────────────────────────────────────────────
-- POW Backgrounds — Supabase Storage bucket for per-school per-sport PNGs.
--
-- Replaces the previous workflow where the Player of the Week page made
-- operators upload (a) a Master Roster CSV and (b) a zip of background PNGs
-- on every session. Roster now pulls live from the same Master Roster gviz
-- endpoint campus-insider.html uses. Backgrounds live here, uploaded once
-- by an admin via the Creative Hub admin panel.
--
-- Storage path: <school-slug>/<sport-slug>.png  (e.g. fiu/wbb.png)
-- Public URL pattern:
--   https://<project>.supabase.co/storage/v1/object/public/pow-backgrounds/<school-slug>/<sport-slug>.png
--
-- Trust model: bucket is PUBLIC READ + ANON WRITE, matching the rest of the
-- Creative Hub (open RLS gated by client-side admin allowlist in
-- admin.html). The kking@conferenceusa.com session is required to see the
-- upload UI. file_size_limit caps individual uploads at 10 MB — real
-- backgrounds are ~2-3 MB.
--
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pow-backgrounds',
  'pow-backgrounds',
  true,
  10485760,   -- 10 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read — anyone can GET a known object URL.
drop policy if exists "Public read pow-backgrounds" on storage.objects;
create policy "Public read pow-backgrounds"
  on storage.objects for select
  to public
  using (bucket_id = 'pow-backgrounds');

-- Anon write — admin.html is the only writer in practice; same trust model
-- as creative_hub_state. If we ever need stricter access, switch to a
-- service-role-key Edge Function proxy.
drop policy if exists "Anon write pow-backgrounds" on storage.objects;
create policy "Anon write pow-backgrounds"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'pow-backgrounds');

drop policy if exists "Anon update pow-backgrounds" on storage.objects;
create policy "Anon update pow-backgrounds"
  on storage.objects for update
  to anon
  using (bucket_id = 'pow-backgrounds')
  with check (bucket_id = 'pow-backgrounds');

drop policy if exists "Anon delete pow-backgrounds" on storage.objects;
create policy "Anon delete pow-backgrounds"
  on storage.objects for delete
  to anon
  using (bucket_id = 'pow-backgrounds');

-- Sanity check
select bucket_id, count(*) as object_count
from storage.objects
where bucket_id = 'pow-backgrounds'
group by bucket_id;
