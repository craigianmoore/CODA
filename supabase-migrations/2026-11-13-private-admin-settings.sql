-- Hides admin PINs from the public (anon) key.
--
-- RUN THIS ONLY AFTER the matching code is deployed. Older builds read and write
-- adminSettings straight from the browser, and would stop working the moment
-- this runs.
--
-- Admin PINs and lockouts now live server-side only (the app's /api/admin/*
-- routes use the service-role key, which bypasses RLS). The anon key keeps
-- working for every other kv_settings row, but can no longer read, write or
-- delete the two admin rows.

drop policy if exists "public read/write kv_settings" on kv_settings;
drop policy if exists "kv_settings open except admin keys" on kv_settings;

create policy "kv_settings open except admin keys" on kv_settings
  for all
  using (key not in ('adminSettings', 'adminLockouts'))
  with check (key not in ('adminSettings', 'adminLockouts'));

-- Check (run as anon / from the SQL editor with the anon role): should return no rows
--   select key from kv_settings where key in ('adminSettings','adminLockouts');
