-- Abilita le estensioni necessarie
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedula il job per eseguire ogni 2 ore
SELECT cron.schedule(
    'check-emails-job', -- Nome univoco del job
    '0 */2 * * *',      -- Cron expression: Ogni 2 ore al minuto 0
    $$
    SELECT
        net.http_post(
            url:='https://zhgpccmzgyertwnvyiaz.supabase.functions.co/check-emails',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoZ3BjY216Z3llcnR3bnZ5aWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTU4NDQsImV4cCI6MjA3OTU3MTg0NH0.A0WxSn-8JKpd4tXTxSxLQIoq3M-654vGpw_guAHpQQc"}'::jsonb
        ) as request_id;
    $$
);

-- Per verificare che il job sia stato creato:
-- SELECT * FROM cron.job;

-- Per vedere i log di esecuzione (se ci sono errori):
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC;
