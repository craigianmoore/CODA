-- Hides CET course-access grants from the public (anon) key.
--
-- RUN THIS ONLY AFTER the matching code is deployed (the app's /api/admin/cet-access
-- route reads and writes this row with the service-role key, which bypasses RLS).
-- Until it runs, a browser holding the anon key could still edit the grants.

drop policy if exists "kv_settings open except admin keys" on kv_settings;

create policy "kv_settings open except admin keys" on kv_settings
  for all
  using (key not in ('adminSettings', 'adminLockouts', 'cetAccess'))
  with check (key not in ('adminSettings', 'adminLockouts', 'cetAccess'));

-- Check (as anon): should return no rows
--   select key from kv_settings where key in ('adminSettings','adminLockouts','cetAccess');
