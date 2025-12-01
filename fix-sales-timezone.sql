-- Fix timezone issue: Subtract 1 hour from sales on 2025-12-01
-- The user provided local times (UTC+1), but we inserted them as UTC.
-- So 18:00 Local -> 17:00 UTC. We inserted 18:00 UTC (which is 19:00 Local).
-- We need to subtract 1 hour.

UPDATE sales
SET sale_date = sale_date - INTERVAL '1 hour'
WHERE sale_date::date = '2025-12-01';
