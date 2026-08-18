-- Course reviews record teaching-specific signals separately from their
-- overall rating. Historical imports intentionally retain null scores.
alter table public.cuhksz_reviews
  add column if not exists grading_rating smallint,
  add column if not exists difficulty_rating smallint;

alter table public.cuhksz_reviews
  add constraint cuhksz_reviews_grading_rating_check
  check (grading_rating is null or grading_rating between 1 and 5),
  add constraint cuhksz_reviews_difficulty_rating_check
  check (difficulty_rating is null or difficulty_rating between 1 and 5),
  add constraint cuhksz_reviews_new_course_scores_check
  check (
    target_type <> 'course'
    or is_historical
    or (
      rating between 1 and 5
      and grading_rating between 1 and 5
      and difficulty_rating between 1 and 5
    )
  );

create table if not exists public.cuhksz_feedback (
  id uuid primary key default gen_random_uuid(),
  author_id text not null,
  category text not null default 'suggestion'
    check (category in ('bug', 'suggestion', 'data', 'other')),
  content text not null
    check (char_length(content) between 10 and 1200),
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists cuhksz_feedback_author_created_idx
  on public.cuhksz_feedback (author_id, created_at desc);

alter table public.cuhksz_feedback enable row level security;

revoke all on public.cuhksz_feedback from public, anon;
grant select, insert on public.cuhksz_feedback to authenticated;
grant all on public.cuhksz_feedback to service_role;

drop policy if exists "cuhksz users create own feedback" on public.cuhksz_feedback;
create policy "cuhksz users create own feedback"
  on public.cuhksz_feedback
  for insert
  to authenticated
  with check (
    author_id = (select auth.jwt()->>'sub')
    and status = 'new'
  );

drop policy if exists "cuhksz users read own feedback" on public.cuhksz_feedback;
create policy "cuhksz users read own feedback"
  on public.cuhksz_feedback
  for select
  to authenticated
  using (author_id = (select auth.jwt()->>'sub'));
