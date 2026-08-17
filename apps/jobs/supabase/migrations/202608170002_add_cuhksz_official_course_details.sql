-- Official CUHK-Shenzhen course catalogue metadata.
-- Existing course ratings, review counts, and student data remain unchanged.

alter table public.cuhksz_courses
  add column if not exists description text not null default '',
  add column if not exists official_url text not null default '';
