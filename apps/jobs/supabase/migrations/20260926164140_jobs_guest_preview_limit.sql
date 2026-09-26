-- Job previews are served by the jobs app after Clerk checks. Direct Data API
-- reads would bypass the fixed ten-job guest preview and its school audience rule.
drop policy if exists "active public jobs are readable" on public.jobs;
revoke select on public.jobs from public, anon, authenticated;
grant select on public.jobs to service_role;

-- Recommendations call this through the server-side service role only.
revoke execute on function public.match_jobs(extensions.vector(1024), integer)
  from public, anon, authenticated;
grant execute on function public.match_jobs(extensions.vector(1024), integer)
  to service_role;
