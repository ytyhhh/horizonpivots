-- CUHK-Shenzhen course and dining reviews.
-- This is an additive migration for the existing Horizon Pivots Supabase project.
-- Identity is provided exclusively by Clerk Third-Party Auth, never auth.users.

create extension if not exists pgcrypto;

create or replace function public.set_cuhksz_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.cuhksz_courses (
  id text primary key,
  code text not null unique,
  name text not null,
  name_en text not null default '',
  school text not null default '学院待确认',
  instructor text not null default '教师待补充',
  term text not null default '学期待补充',
  tags text[] not null default '{}',
  scores jsonb not null default '{}'::jsonb,
  rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  review_count integer not null default 0 check (review_count >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cuhksz_dining_halls (
  id text primary key,
  name text not null,
  location text not null default '',
  hours text not null default '',
  stall_count integer not null default 0,
  rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  review_count integer not null default 0 check (review_count >= 0),
  tone text not null default 'green',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cuhksz_course_offerings (
  id text primary key,
  course_id text not null references public.cuhksz_courses(id) on update cascade on delete cascade,
  course_code text not null,
  instructor text not null,
  term text not null,
  school text not null default '学院待确认',
  rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  review_count integer not null default 0 check (review_count >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_code, instructor, term)
);

create table if not exists public.cuhksz_dishes (
  id text primary key,
  hall_id text not null references public.cuhksz_dining_halls(id) on update cascade on delete restrict,
  name text not null,
  stall text not null default '',
  hall text not null default '',
  price numeric(8,2) not null default 0 check (price >= 0),
  tags text[] not null default '{}',
  image text not null default 'assets/campus-dining-hero.jpg',
  position text not null default '50% 50%',
  scores jsonb not null default '{}'::jsonb,
  rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  review_count integer not null default 0 check (review_count >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cuhksz_reviews (
  id uuid primary key default gen_random_uuid(),
  author_id text not null,
  target_type text not null check (target_type in ('course', 'dish', 'hall')),
  target_id text not null,
  target text not null default '',
  context text not null default '',
  rating smallint not null check (rating between 1 and 5),
  content text not null check (char_length(content) between 10 and 800),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (author_id, target_type, target_id)
);

create table if not exists public.cuhksz_favorites (
  user_id text not null,
  target_type text not null check (target_type in ('course', 'dish', 'hall')),
  target_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

create index if not exists cuhksz_courses_school_rating_idx on public.cuhksz_courses (school, rating desc);
create index if not exists cuhksz_courses_code_idx on public.cuhksz_courses (code);
create index if not exists cuhksz_course_offerings_course_idx on public.cuhksz_course_offerings (course_id, term);
create index if not exists cuhksz_course_offerings_instructor_idx on public.cuhksz_course_offerings (instructor);
create index if not exists cuhksz_dishes_hall_rating_idx on public.cuhksz_dishes (hall_id, rating desc);
create index if not exists cuhksz_reviews_target_status_idx on public.cuhksz_reviews (target_type, target_id, status, created_at desc);
create index if not exists cuhksz_reviews_author_idx on public.cuhksz_reviews (author_id, created_at desc);

drop trigger if exists cuhksz_courses_updated_at on public.cuhksz_courses;
create trigger cuhksz_courses_updated_at before update on public.cuhksz_courses for each row execute function public.set_cuhksz_updated_at();
drop trigger if exists cuhksz_dining_halls_updated_at on public.cuhksz_dining_halls;
create trigger cuhksz_dining_halls_updated_at before update on public.cuhksz_dining_halls for each row execute function public.set_cuhksz_updated_at();
drop trigger if exists cuhksz_course_offerings_updated_at on public.cuhksz_course_offerings;
create trigger cuhksz_course_offerings_updated_at before update on public.cuhksz_course_offerings for each row execute function public.set_cuhksz_updated_at();
drop trigger if exists cuhksz_dishes_updated_at on public.cuhksz_dishes;
create trigger cuhksz_dishes_updated_at before update on public.cuhksz_dishes for each row execute function public.set_cuhksz_updated_at();
drop trigger if exists cuhksz_reviews_updated_at on public.cuhksz_reviews;
create trigger cuhksz_reviews_updated_at before update on public.cuhksz_reviews for each row execute function public.set_cuhksz_updated_at();

alter table public.cuhksz_courses enable row level security;
alter table public.cuhksz_dining_halls enable row level security;
alter table public.cuhksz_dishes enable row level security;
alter table public.cuhksz_course_offerings enable row level security;
alter table public.cuhksz_reviews enable row level security;
alter table public.cuhksz_favorites enable row level security;

drop policy if exists "cuhksz public reads active courses" on public.cuhksz_courses;
create policy "cuhksz public reads active courses" on public.cuhksz_courses for select using (active = true);
drop policy if exists "cuhksz public reads active halls" on public.cuhksz_dining_halls;
create policy "cuhksz public reads active halls" on public.cuhksz_dining_halls for select using (active = true);
drop policy if exists "cuhksz public reads active offerings" on public.cuhksz_course_offerings;
create policy "cuhksz public reads active offerings" on public.cuhksz_course_offerings for select using (active = true);
drop policy if exists "cuhksz public reads active dishes" on public.cuhksz_dishes;
create policy "cuhksz public reads active dishes" on public.cuhksz_dishes for select using (active = true);
drop policy if exists "cuhksz reads published or own reviews" on public.cuhksz_reviews;
create policy "cuhksz reads published or own reviews" on public.cuhksz_reviews
  for select using (status = 'published' or author_id = (select auth.jwt()->>'sub'));
drop policy if exists "cuhksz users create own reviews" on public.cuhksz_reviews;
create policy "cuhksz users create own reviews" on public.cuhksz_reviews
  for insert to authenticated with check (author_id = (select auth.jwt()->>'sub') and status = 'pending');
drop policy if exists "cuhksz users update own pending reviews" on public.cuhksz_reviews;
create policy "cuhksz users update own pending reviews" on public.cuhksz_reviews
  for update to authenticated using (author_id = (select auth.jwt()->>'sub')) with check (author_id = (select auth.jwt()->>'sub') and status = 'pending');
drop policy if exists "cuhksz users delete own reviews" on public.cuhksz_reviews;
create policy "cuhksz users delete own reviews" on public.cuhksz_reviews
  for delete to authenticated using (author_id = (select auth.jwt()->>'sub'));
drop policy if exists "cuhksz users read own favorites" on public.cuhksz_favorites;
create policy "cuhksz users read own favorites" on public.cuhksz_favorites
  for select to authenticated using (user_id = (select auth.jwt()->>'sub'));
drop policy if exists "cuhksz users create own favorites" on public.cuhksz_favorites;
create policy "cuhksz users create own favorites" on public.cuhksz_favorites
  for insert to authenticated with check (user_id = (select auth.jwt()->>'sub'));
drop policy if exists "cuhksz users delete own favorites" on public.cuhksz_favorites;
create policy "cuhksz users delete own favorites" on public.cuhksz_favorites
  for delete to authenticated using (user_id = (select auth.jwt()->>'sub'));

grant usage on schema public to anon, authenticated;
grant select on public.cuhksz_courses, public.cuhksz_course_offerings, public.cuhksz_dining_halls, public.cuhksz_dishes, public.cuhksz_reviews to anon, authenticated;
grant insert, update, delete on public.cuhksz_reviews to authenticated;
grant select, insert, delete on public.cuhksz_favorites to authenticated;
