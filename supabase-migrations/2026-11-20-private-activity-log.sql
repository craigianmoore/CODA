-- Hides the activity log from the public (anon) key.
--
-- RUN THIS ONLY AFTER the matching code is deployed (the app's /api/activity and
-- /api/admin/activity routes use the service-role key, which bypasses RLS).
-- Until it runs, a browser holding the anon key could read or edit the log.

drop policy if exists "kv_settings open except admin keys" on kv_settings;

create policy "kv_settings open except admin keys" on kv_settings
  for all
  using (key not in ('adminSettings', 'adminLockouts', 'cetAccess', 'activityLog', 'activityLogApp'))
  with check (key not in ('adminSettings', 'adminLockouts', 'cetAccess', 'activityLog', 'activityLogApp'));

-- Check (as anon): should return no rows
--   select key from kv_settings where key in ('activityLog','activityLogApp');
