-- Enable required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule the job to run every 2 hours
-- Cron syntax: minute hour day month day_of_week
-- '0 */2 * * *' means "At minute 0 past every 2nd hour."
select
  cron.schedule(
    'check-emails-every-2-hours',
    '0 */2 * * *',
    $$
    select
      net.http_post(
          url:='https://zhgpccmzgyertwnvyiaz.supabase.co/functions/v1/gmail-checker',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoZ3BjY216Z3llcnR3bnZ5aWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTU4NDQsImV4cCI6MjA3OTU3MTg0NH0.A0WxSn-8JKpd4tXTxSxLQIoq3M-654vGpw_guAHpQQc"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
  );

-- Verify the job was created
select * from cron.job;
