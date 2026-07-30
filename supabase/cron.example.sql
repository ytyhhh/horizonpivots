-- Run this after the production URL and CRON_SECRET have been stored in Vault.
-- Names are intentionally stable so this script is idempotent.

select vault.create_secret(
  'https://your-production-domain.example',
  'campus_radar_site_url'
)
where not exists (
  select 1 from vault.secrets where name = 'campus_radar_site_url'
);

select vault.create_secret(
  'replace-with-the-same-value-as-CRON_SECRET',
  'campus_radar_cron_secret'
)
where not exists (
  select 1 from vault.secrets where name = 'campus_radar_cron_secret'
);

select cron.schedule(
  'ingest-public-jobs-every-six-hours',
  '17 */6 * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'campus_radar_site_url'
    ) || '/api/cron/ingest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'campus_radar_cron_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
)
where not exists (
  select 1 from cron.job
  where jobname = 'ingest-public-jobs-every-six-hours'
);

select cron.schedule(
  'discover-official-recruiting-pages-daily',
  '41 1 * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'campus_radar_site_url'
    ) || '/api/cron/discover',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'campus_radar_cron_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
)
where not exists (
  select 1 from cron.job
  where jobname = 'discover-official-recruiting-pages-daily'
);
