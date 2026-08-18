-- Course evaluations need a concrete teacher and term. Existing reviews remain
-- readable; the NOT VALID constraint is enforced for all newly written rows.

alter table public.cuhksz_reviews
  add column if not exists instructor text not null default '',
  add column if not exists term text not null default '';

alter table public.cuhksz_reviews
  drop constraint if exists cuhksz_reviews_author_id_target_type_target_id_key;

alter table public.cuhksz_reviews
  add constraint cuhksz_reviews_author_target_context_key
  unique (author_id, target_type, target_id, instructor, term);

alter table public.cuhksz_reviews
  add constraint cuhksz_reviews_course_context_check
  check (
    target_type <> 'course'
    or (
      char_length(btrim(instructor)) between 1 and 120
      and char_length(btrim(term)) between 1 and 80
    )
  ) not valid;
