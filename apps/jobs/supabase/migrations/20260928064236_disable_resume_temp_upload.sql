-- Resume profiles are now manual-only. Keep the private bucket and existing
-- read/delete policies for historical cleanup, but stop direct browser uploads.
drop policy if exists "users upload own temporary resume" on storage.objects;
