alter table public.jobs
  add column if not exists description text not null default ''
  check (char_length(description) <= 12000);
