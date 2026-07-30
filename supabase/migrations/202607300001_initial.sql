create extension if not exists vector with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create type public.job_status as enum ('active', 'stale', 'archived', 'review');
create type public.source_confidence as enum ('官方', '已核验', '社区线索');
create type public.run_status as enum ('running', 'succeeded', 'failed');

create table public.jobs (
  id text primary key,
  company text not null check (char_length(company) between 1 and 120),
  title text not null check (char_length(title) between 1 and 180),
  program text,
  job_type text not null check (job_type in ('秋招', '实习')),
  batch text not null,
  industry text not null,
  locations text[] not null default '{}',
  cohort text not null default '不限',
  skills text[] not null default '{}',
  summary text not null default '' check (char_length(summary) <= 500),
  deadline date,
  apply_url text,
  source_url text not null,
  source_name text not null,
  source_confidence public.source_confidence not null default '社区线索',
  first_seen date not null default current_date,
  last_seen date not null default current_date,
  verified_at timestamptz,
  status public.job_status not null default 'active',
  fingerprint text not null unique,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_status_first_seen_idx on public.jobs (status, first_seen desc);
create index jobs_deadline_idx on public.jobs (deadline) where status = 'active';
create index jobs_industry_idx on public.jobs (industry);
create index jobs_locations_idx on public.jobs using gin (locations);
create index jobs_skills_idx on public.jobs using gin (skills);
create index jobs_embedding_idx on public.jobs
  using hnsw (embedding extensions.vector_cosine_ops)
  where embedding is not null;

create table public.candidate_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  graduation_year integer check (graduation_year between 2024 and 2035),
  education text not null default '',
  major text not null default '',
  skills text[] not null default '{}',
  experiences text[] not null default '{}',
  project_domains text[] not null default '{}',
  preferred_locations text[] not null default '{}',
  preferred_industries text[] not null default '{}',
  preferred_roles text[] not null default '{}',
  excluded_companies text[] not null default '{}',
  confirmed boolean not null default false,
  version integer not null default 1 check (version > 0),
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.saved_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind text not null check (kind in ('json', 'rss', 'html', 'sitemap', 'web-search')),
  url text not null,
  enabled boolean not null default true,
  confidence public.source_confidence not null default '社区线索',
  health text not null default 'healthy' check (health in ('healthy', 'degraded', 'paused')),
  config jsonb not null default '{}'::jsonb,
  last_run_at timestamptz,
  last_success_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.sources (name, kind, url, confidence)
values (
  'xixicc2027',
  'json',
  'https://raw.githubusercontent.com/xixicc186/xixicc2027/main/jobs.json',
  '已核验'
)
on conflict (name) do nothing;

insert into public.sources (name, kind, url, confidence)
values (
  '公开网页发现',
  'web-search',
  'openai://web-search/campus-recruiting',
  '社区线索'
)
on conflict (name) do nothing;

create table public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  status public.run_status not null default 'running',
  fetched integer not null default 0,
  created integer not null default 0,
  updated integer not null default 0,
  reviewed integer not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index ingestion_runs_started_idx
  on public.ingestion_runs (started_at desc);

create table public.review_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  job_id text references public.jobs(id) on delete cascade,
  reason text not null,
  confidence numeric(4,3) check (confidence between 0 and 1),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

create table public.resume_parse_jobs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('processing', 'succeeded', 'failed')),
  storage_path text,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index resume_parse_jobs_user_idx
  on public.resume_parse_jobs (user_id, created_at desc);

create table public.recommendation_cache (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text not null references public.jobs(id) on delete cascade,
  profile_version integer not null,
  job_updated_at timestamptz not null,
  tier text not null check (tier in ('高匹配', '值得尝试', '拓展机会')),
  total_score numeric(5,4) not null,
  scores jsonb not null,
  matches text[] not null default '{}',
  gaps text[] not null default '{}',
  explanation text not null check (char_length(explanation) <= 240),
  created_at timestamptz not null default now(),
  primary key (user_id, job_id, profile_version)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.candidate_profiles
for each row execute function public.set_updated_at();

create trigger sources_set_updated_at
before update on public.sources
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function public.refresh_job_statuses()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.jobs
  set status = 'archived'
  where deadline < current_date
    and status in ('active', 'stale');

  update public.jobs
  set status = 'stale'
  where deadline is null
    and last_seen < current_date - interval '14 days'
    and status = 'active';
end;
$$;

select cron.schedule(
  'refresh-job-statuses-daily',
  '15 0 * * *',
  $$select public.refresh_job_statuses();$$
)
where not exists (
  select 1 from cron.job where jobname = 'refresh-job-statuses-daily'
);

create or replace function public.match_jobs(
  query_embedding extensions.vector(1536),
  match_count integer default 50
)
returns table (job_id text, similarity double precision)
language sql
stable
set search_path = ''
as $$
  select
    jobs.id,
    1 - (jobs.embedding <=> query_embedding) as similarity
  from public.jobs
  where jobs.status = 'active'
    and jobs.embedding is not null
    and (jobs.deadline is null or jobs.deadline >= current_date)
  order by jobs.embedding <=> query_embedding
  limit least(match_count, 100);
$$;

alter table public.jobs enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.sources enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.review_items enable row level security;
alter table public.resume_parse_jobs enable row level security;
alter table public.recommendation_cache enable row level security;

create policy "active jobs are publicly readable"
on public.jobs for select
using (
  status in ('active', 'stale')
  and (deadline is null or deadline >= current_date)
);

create policy "users read own profile"
on public.candidate_profiles for select
using (auth.uid() = user_id);

create policy "users insert own profile"
on public.candidate_profiles for insert
with check (auth.uid() = user_id);

create policy "users update own profile"
on public.candidate_profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users delete own profile"
on public.candidate_profiles for delete
using (auth.uid() = user_id);

create policy "users manage own saved jobs"
on public.saved_jobs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users read own parse jobs"
on public.resume_parse_jobs for select
using (auth.uid() = user_id);

create policy "users read own recommendation cache"
on public.recommendation_cache for select
using (auth.uid() = user_id);

create policy "admins read sources"
on public.sources for select
using (public.is_admin());

create policy "admins read ingestion runs"
on public.ingestion_runs for select
using (public.is_admin());

create policy "admins manage review items"
on public.review_items for all
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resume-temp',
  'resume-temp',
  false,
  5242880,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "users upload own temporary resume"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'resume-temp'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users read own temporary resume"
on storage.objects for select to authenticated
using (
  bucket_id = 'resume-temp'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users delete own temporary resume"
on storage.objects for delete to authenticated
using (
  bucket_id = 'resume-temp'
  and (storage.foldername(name))[1] = auth.uid()::text
);
