-- Horizon Pivots adds PhD Scope to the existing Clerk-backed project.
-- This migration is additive for PhD data and preserves existing hiring records.

alter table public.review_items
  drop constraint if exists review_items_resolved_by_fkey;

alter table public.review_items
  alter column resolved_by type text using resolved_by::text;

create table public.phd_profiles (
  user_id text primary key default (auth.jwt() ->> 'sub'),
  education text not null default '',
  major text not null default '',
  research_experience text not null default '',
  skills text[] not null default '{}',
  publications text,
  updated_at timestamptz not null default now()
);

create table public.phd_search_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  status text not null default 'queued' check (status in ('queued', 'running', 'complete', 'partial', 'failed')),
  stage text not null default 'queued',
  progress integer not null default 0 check (progress between 0 and 100),
  query jsonb not null,
  school_progress jsonb not null default '[]'::jsonb,
  trigger_run_id text,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index phd_search_jobs_user_created_idx on public.phd_search_jobs (user_id, created_at desc);

create table public.phd_faculty_recommendations (
  id text not null,
  search_job_id uuid not null references public.phd_search_jobs(id) on delete cascade,
  user_id text not null default (auth.jwt() ->> 'sub'),
  institution_id text not null,
  author_id text not null,
  payload jsonb not null,
  rank integer not null,
  created_at timestamptz not null default now(),
  primary key (search_job_id, id)
);

create index phd_recommendations_user_idx on public.phd_faculty_recommendations (user_id, search_job_id, rank);

create table public.phd_shortlist_entries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  faculty_id text not null,
  faculty_snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'saved' check (status in ('saved', 'preparing', 'contacted', 'replied', 'closed')),
  updated_at timestamptz not null default now(),
  unique (user_id, faculty_id)
);

create table public.phd_email_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  faculty_id text not null,
  subject text not null,
  body text not null,
  provider text not null check (provider in ('siliconflow', 'template')),
  updated_at timestamptz not null default now()
);

create index phd_email_drafts_user_updated_idx on public.phd_email_drafts (user_id, updated_at desc);

create trigger phd_profiles_set_updated_at
before update on public.phd_profiles
for each row execute function public.set_updated_at();

create trigger phd_shortlist_set_updated_at
before update on public.phd_shortlist_entries
for each row execute function public.set_updated_at();

create trigger phd_email_drafts_set_updated_at
before update on public.phd_email_drafts
for each row execute function public.set_updated_at();

alter table public.phd_profiles enable row level security;
alter table public.phd_search_jobs enable row level security;
alter table public.phd_faculty_recommendations enable row level security;
alter table public.phd_shortlist_entries enable row level security;
alter table public.phd_email_drafts enable row level security;

create policy "phd users manage own profile"
on public.phd_profiles for all to authenticated
using ((select auth.jwt() ->> 'sub') = user_id)
with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "phd users manage own search jobs"
on public.phd_search_jobs for all to authenticated
using ((select auth.jwt() ->> 'sub') = user_id)
with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "phd users manage own recommendations"
on public.phd_faculty_recommendations for all to authenticated
using ((select auth.jwt() ->> 'sub') = user_id)
with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "phd users manage own shortlist"
on public.phd_shortlist_entries for all to authenticated
using ((select auth.jwt() ->> 'sub') = user_id)
with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "phd users manage own drafts"
on public.phd_email_drafts for all to authenticated
using ((select auth.jwt() ->> 'sub') = user_id)
with check ((select auth.jwt() ->> 'sub') = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('phd-resumes', 'phd-resumes', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "phd users upload own resume"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'phd-resumes'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
);

create policy "phd users read own resume"
on storage.objects for select to authenticated
using (
  bucket_id = 'phd-resumes'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
);

create policy "phd users delete own resume"
on storage.objects for delete to authenticated
using (
  bucket_id = 'phd-resumes'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
);
