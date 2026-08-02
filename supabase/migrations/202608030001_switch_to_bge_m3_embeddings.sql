-- BAAI/bge-m3 produces 1024-dimensional vectors. Existing OpenAI vectors
-- cannot be cast safely, so clear them and let the application rebuild them.
drop index if exists public.jobs_embedding_idx;
drop function if exists public.match_jobs(extensions.vector, integer);

alter table public.jobs
  alter column embedding type extensions.vector(1024)
  using null::extensions.vector(1024),
  add column if not exists embedding_content_hash text,
  add column if not exists embedding_source_hash text,
  add column if not exists embedding_model text,
  add column if not exists embedded_at timestamptz;

alter table public.candidate_profiles
  alter column embedding type extensions.vector(1024)
  using null::extensions.vector(1024),
  add column if not exists embedding_content_hash text,
  add column if not exists embedding_source_hash text,
  add column if not exists embedding_model text,
  add column if not exists embedded_at timestamptz;

create index jobs_embedding_idx on public.jobs
  using hnsw (embedding extensions.vector_cosine_ops)
  where embedding is not null;

create or replace function public.match_jobs(
  query_embedding extensions.vector(1024),
  match_count integer default 50
)
returns table (job_id text, similarity double precision)
language sql
stable
set search_path = ''
as $$
  select
    jobs.id,
    1 - (jobs.embedding OPERATOR(extensions.<=>) query_embedding) as similarity
  from public.jobs
  where jobs.status = 'active'
    and jobs.embedding is not null
    and (jobs.deadline is null or jobs.deadline >= current_date)
  order by jobs.embedding OPERATOR(extensions.<=>) query_embedding
  limit least(match_count, 100);
$$;

-- Explanation caches must not survive a change in semantic model.
delete from public.recommendation_cache;
