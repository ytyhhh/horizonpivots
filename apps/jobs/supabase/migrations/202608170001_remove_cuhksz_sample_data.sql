-- Remove the retired CUHK-Shenzhen demo catalogue and mark the imported
-- legacy reviews as historical. New reviews retain their actual creation date.

alter table public.cuhksz_reviews
  add column if not exists is_historical boolean not null default false;

delete from public.cuhksz_reviews
where author_id = 'seed-public'
   or id in (
     '00000000-0000-4000-8000-000000000001'::uuid,
     '00000000-0000-4000-8000-000000000002'::uuid,
     '00000000-0000-4000-8000-000000000003'::uuid
   );

delete from public.cuhksz_dishes
where id in ('beef', 'tomato', 'chicken', 'noodles');

delete from public.cuhksz_dining_halls
where id in ('shaw', 'diligentia', 'muse');

delete from public.cuhksz_courses
where id in ('csc3100', 'mat2040', 'eco2010', 'eng1001', 'phy1002', 'sta2001');

update public.cuhksz_reviews
set is_historical = true
where author_id like 'legacy:%';
