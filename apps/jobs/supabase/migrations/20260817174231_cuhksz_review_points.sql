-- Reward one-time points only when a non-historical CUHKSZ review becomes published.
-- The ledger, rather than a client-maintained counter, prevents duplicate rewards.

create table if not exists public.cuhksz_point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  review_id uuid not null references public.cuhksz_reviews(id) on delete cascade,
  points smallint not null check (points > 0),
  reason text not null default '有效评价奖励',
  created_at timestamptz not null default now(),
  unique (review_id)
);

create index if not exists cuhksz_point_ledger_user_created_idx
  on public.cuhksz_point_ledger (user_id, created_at desc);

alter table public.cuhksz_point_ledger enable row level security;

drop policy if exists "cuhksz users read own points" on public.cuhksz_point_ledger;
create policy "cuhksz users read own points"
  on public.cuhksz_point_ledger
  for select to authenticated
  using (user_id = (select auth.jwt()->>'sub'));

grant select on public.cuhksz_point_ledger to authenticated;

create or replace function public.award_cuhksz_review_points()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if new.status = 'published'
    and not new.is_historical
    and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    insert into public.cuhksz_point_ledger (user_id, review_id, points, reason)
    values (new.author_id, new.id, 5, '有效评价奖励')
    on conflict (review_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.award_cuhksz_review_points() from public, anon, authenticated;

drop trigger if exists cuhksz_review_points on public.cuhksz_reviews;
create trigger cuhksz_review_points
  after insert or update of status on public.cuhksz_reviews
  for each row execute function public.award_cuhksz_review_points();
