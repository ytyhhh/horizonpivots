create extension if not exists pgcrypto;

create type public.search_job_status as enum ('queued', 'running', 'complete', 'partial', 'failed');
create type public.shortlist_status as enum ('saved', 'preparing', 'contacted', 'replied', 'closed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  education text not null default '',
  major text not null default '',
  research_experience text not null default '',
  skills text[] not null default '{}',
  publications text,
  updated_at timestamptz not null default now()
);

create table public.search_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.search_job_status not null default 'queued',
  stage text not null default 'queued',
  progress int not null default 0 check (progress between 0 and 100),
  query jsonb not null,
  school_progress jsonb not null default '[]',
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.faculty_recommendations (
  id text not null,
  search_job_id uuid not null references public.search_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_id text not null,
  author_id text not null,
  payload jsonb not null,
  rank int not null,
  created_at timestamptz not null default now(),
  primary key (search_job_id, id)
);

create table public.shortlist_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  faculty_id text not null,
  faculty_snapshot jsonb not null,
  status public.shortlist_status not null default 'saved',
  updated_at timestamptz not null default now(),
  unique (user_id, faculty_id)
);

create table public.email_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  faculty_id text not null,
  subject text not null,
  body text not null,
  provider text not null check (provider in ('siliconflow', 'template')),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.search_jobs enable row level security;
alter table public.faculty_recommendations enable row level security;
alter table public.shortlist_entries enable row level security;
alter table public.email_drafts enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own search jobs" on public.search_jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own recommendations" on public.faculty_recommendations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own shortlist" on public.shortlist_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own drafts" on public.email_drafts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "resume owner read" on storage.objects for select
using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "resume owner upload" on storage.objects for insert
with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "resume owner delete" on storage.objects for delete
using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
