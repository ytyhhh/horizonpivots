-- Public review content is served only through the CUHK-Shenzhen Next.js API.
-- This removes the browser's direct, bulk-read path to the review table while
-- retaining authenticated users' access to their own pending/submitted reviews.

drop policy if exists "cuhksz reads published or own reviews" on public.cuhksz_reviews;
drop policy if exists "cuhksz users read own reviews" on public.cuhksz_reviews;

create policy "cuhksz users read own reviews"
  on public.cuhksz_reviews
  for select
  to authenticated
  using (author_id = (select auth.jwt()->>'sub'));

revoke select on public.cuhksz_reviews from public, anon;
grant select on public.cuhksz_reviews to authenticated, service_role;
