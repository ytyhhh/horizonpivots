alter table public.jobs
  add column if not exists cuhk_shenzhen_only boolean not null default false;

create index if not exists jobs_cuhk_shenzhen_only_idx
  on public.jobs (cuhk_shenzhen_only, first_seen desc);

drop policy if exists "active jobs are publicly readable" on public.jobs;
create policy "active public jobs are readable"
on public.jobs for select
using (
  status in ('active', 'stale')
  and (deadline is null or deadline >= current_date)
  and not cuhk_shenzhen_only
);

insert into public.sources (name, kind, url, confidence)
values (
  '港中深就业中心',
  'html',
  'https://career.cuhk.edu.cn/job/search/',
  '官方'
)
on conflict (name) do nothing;
