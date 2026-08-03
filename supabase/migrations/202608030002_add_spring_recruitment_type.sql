alter table public.jobs drop constraint if exists jobs_job_type_check;

alter table public.jobs
  add constraint jobs_job_type_check
  check (job_type in ('秋招', '春招', '实习'));
