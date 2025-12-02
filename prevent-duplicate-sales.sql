-- Add unique constraint to prevent duplicate sales from same email
-- This prevents race conditions when check-emails runs multiple times

-- First, remove any existing duplicates (keep the oldest one)
DELETE FROM sales a
USING sales b
WHERE a.id > b.id
  AND a.email_subject = b.email_subject
  AND a.platform_id = b.platform_id
  AND a.amount = b.amount
  AND DATE(a.sale_date) = DATE(b.sale_date);

-- Add unique index on email_subject + platform_id + amount + sale_date (date part only)
-- This prevents the same email from creating duplicate sales
CREATE UNIQUE INDEX IF NOT EXISTS sales_unique_email_idx 
ON sales (email_subject, platform_id, amount, DATE(sale_date))
WHERE email_subject IS NOT NULL;

-- Log the change
COMMENT ON INDEX sales_unique_email_idx IS 'Prevents duplicate sales from the same email being processed multiple times';
