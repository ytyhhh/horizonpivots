-- Optional manual-only resume details. Existing Clerk-owned profiles keep their
-- current fields and receive empty values without rewriting historical rows.
alter table public.candidate_profiles
  add column if not exists educations jsonb not null default '[]'::jsonb,
  add column if not exists work_experiences jsonb not null default '[]'::jsonb,
  add column if not exists projects jsonb not null default '[]'::jsonb,
  add column if not exists languages text[] not null default '{}',
  add column if not exists certifications text[] not null default '{}';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'candidate_profiles_manual_entries_shape_check'
      and conrelid = 'public.candidate_profiles'::regclass
  ) then
    alter table public.candidate_profiles
      add constraint candidate_profiles_manual_entries_shape_check check (
        jsonb_typeof(educations) = 'array'
        and jsonb_array_length(educations) <= 5
        and jsonb_typeof(work_experiences) = 'array'
        and jsonb_array_length(work_experiences) <= 10
        and jsonb_typeof(projects) = 'array'
        and jsonb_array_length(projects) <= 10
        and cardinality(languages) <= 20
        and cardinality(certifications) <= 20
      );
  end if;
end $$;
