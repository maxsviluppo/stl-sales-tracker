-- Rimuovi il vecchio cron job (se esiste)
SELECT cron.unschedule('check-emails-job');

-- Crea il nuovo job per gmail-checker
SELECT cron.schedule(
    'gmail-checker-job',
    '0 */2 * * *',  -- Ogni 2 ore
    $$
    SELECT
        net.http_post(
            url:='https://zhgpccmzgyertwnvyiaz.supabase.co/functions/v1/gmail-checker',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoZ3BjY216Z3llcnR3bnZ5aWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTU4NDQsImV4cCI6MjA3OTU3MTg0NH0.A0WxSn-8JKpd4tXTxSxLQIoq3M-654vGpw_guAHpQQc"}'::jsonb
        ) as request_id;
    $$
);

-- Verifica che il job sia stato creato
SELECT * FROM cron.job WHERE jobname = 'gmail-checker-job';
