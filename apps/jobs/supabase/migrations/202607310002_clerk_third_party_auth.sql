-- Clerk user IDs use the `user_...` text format, while Supabase Auth uses UUIDs.
-- Keep all user-owned data keyed by the third-party subject claim instead.
drop policy if exists "users read own profile" on public.candidate_profiles;
drop policy if exists "users insert own profile" on public.candidate_profiles;
drop policy if exists "users update own profile" on public.candidate_profiles;
drop policy if exists "users delete own profile" on public.candidate_profiles;
drop policy if exists "users manage own saved jobs" on public.saved_jobs;
drop policy if exists "users read own parse jobs" on public.resume_parse_jobs;
drop policy if exists "users read own recommendation cache" on public.recommendation_cache;
drop policy if exists "users upload own temporary resume" on storage.objects;
drop policy if exists "users read own temporary resume" on storage.objects;
drop policy if exists "users delete own temporary resume" on storage.objects;

alter table public.candidate_profiles
  drop constraint if exists candidate_profiles_user_id_fkey;
alter table public.saved_jobs
  drop constraint if exists saved_jobs_user_id_fkey;
alter table public.resume_parse_jobs
  drop constraint if exists resume_parse_jobs_user_id_fkey;
alter table public.recommendation_cache
  drop constraint if exists recommendation_cache_user_id_fkey;

alter table public.candidate_profiles
  alter column user_id type text using user_id::text;
alter table public.saved_jobs
  alter column user_id type text using user_id::text;
alter table public.resume_parse_jobs
  alter column user_id type text using user_id::text;
alter table public.recommendation_cache
  alter column user_id type text using user_id::text;

create policy "users read own profile"
on public.candidate_profiles for select to authenticated
using ((select auth.jwt() ->> 'sub') = user_id);

create policy "users insert own profile"
on public.candidate_profiles for insert to authenticated
with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "users update own profile"
on public.candidate_profiles for update to authenticated
using ((select auth.jwt() ->> 'sub') = user_id)
with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "users delete own profile"
on public.candidate_profiles for delete to authenticated
using ((select auth.jwt() ->> 'sub') = user_id);

create policy "users manage own saved jobs"
on public.saved_jobs for all to authenticated
using ((select auth.jwt() ->> 'sub') = user_id)
with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "users read own parse jobs"
on public.resume_parse_jobs for select to authenticated
using ((select auth.jwt() ->> 'sub') = user_id);

create policy "users read own recommendation cache"
on public.recommendation_cache for select to authenticated
using ((select auth.jwt() ->> 'sub') = user_id);

create policy "users upload own temporary resume"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'resume-temp'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
);

create policy "users read own temporary resume"
on storage.objects for select to authenticated
using (
  bucket_id = 'resume-temp'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
);

create policy "users delete own temporary resume"
on storage.objects for delete to authenticated
using (
  bucket_id = 'resume-temp'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
);
