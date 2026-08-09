alter table public.sources
  drop constraint if exists sources_root_domain_key;

alter table public.sources
  add column if not exists canonical_url text,
  add column if not exists company_domain text,
  add column if not exists fetch_mode text not null default 'auto'
    check (fetch_mode in ('auto', 'http', 'browser')),
  add column if not exists browser_pending boolean not null default false,
  add column if not exists last_fetch_mode text
    check (last_fetch_mode in ('http', 'browser'));

update public.sources
set canonical_url = regexp_replace(url, '/+$', '')
where canonical_url is null
  and url ~ '^https://';

alter table public.sources
  drop constraint if exists sources_canonical_url_key;

alter table public.sources
  add constraint sources_canonical_url_key unique (canonical_url);

create index if not exists sources_browser_pending_idx
  on public.sources (browser_pending, enabled, next_run_at)
  where confidence = '官方';

create or replace function public.pending_job_embeddings(
  expected_model text,
  max_count integer default 48
)
returns setof public.jobs
language sql
stable
set search_path = ''
as $$
  select jobs.*
  from public.jobs
  where jobs.status in ('active', 'stale')
    and (
      jobs.embedding is null
      or jobs.embedding_source_hash is distinct from jobs.embedding_content_hash
      or jobs.embedding_model is distinct from expected_model
    )
  order by jobs.updated_at desc
  limit least(greatest(max_count, 1), 100);
$$;

revoke all on function public.pending_job_embeddings(text, integer) from public;
grant execute on function public.pending_job_embeddings(text, integer) to service_role;
