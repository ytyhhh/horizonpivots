alter table public.sources
  add column if not exists root_domain text unique,
  add column if not exists trust_score integer not null default 0
    check (trust_score between 0 and 100),
  add column if not exists trust_signals jsonb not null default '[]'::jsonb,
  add column if not exists discovered_by text,
  add column if not exists next_run_at timestamptz,
  add column if not exists consecutive_failures integer not null default 0
    check (consecutive_failures >= 0),
  add column if not exists last_error text;

alter table public.jobs
  add column if not exists source_id uuid references public.sources(id) on delete set null,
  add column if not exists source_item_key text,
  add column if not exists extraction_method text
    check (extraction_method in ('json-ld', 'selectors', 'llm')),
  add column if not exists evidence jsonb not null default '{}'::jsonb,
  add column if not exists last_seen_run_id uuid references public.ingestion_runs(id) on delete set null,
  add column if not exists source_content_hash text,
  add column if not exists content_updated_at timestamptz,
  add column if not exists missing_count integer not null default 0
    check (missing_count >= 0);

create unique index if not exists jobs_source_item_unique
  on public.jobs (source_id, source_item_key)
  where source_id is not null and source_item_key is not null;

create index if not exists sources_due_idx
  on public.sources (enabled, next_run_at)
  where confidence = '官方';

alter table public.review_items
  add column if not exists review_key text unique;

create table if not exists public.daily_digest_runs (
  digest_date date primary key,
  status text not null check (status in ('sending', 'succeeded', 'failed')),
  resend_email_id text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now()
);

drop trigger if exists daily_digest_runs_set_updated_at on public.daily_digest_runs;
create trigger daily_digest_runs_set_updated_at
before update on public.daily_digest_runs
for each row execute function public.set_updated_at();

alter table public.daily_digest_runs enable row level security;

create policy "admins read digest runs"
on public.daily_digest_runs for select
using (public.is_admin());
