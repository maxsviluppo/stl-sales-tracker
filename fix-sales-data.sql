-- 1. Remove Duplicate "Little Pollon" sale (keep only one)
DELETE FROM sales
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY product_name, amount, sale_date::date ORDER BY id) as r_num
    FROM sales
    WHERE product_name LIKE '%Little Pollon%' AND sale_date::date = '2025-12-01'
  ) t
  WHERE t.r_num > 1
);

-- 2. Insert Missing "Jack Skellington" sale at 16:53
-- First, check if it exists to avoid creating another duplicate if run multiple times
INSERT INTO sales (platform_id, email_account_id, product_name, amount, currency, sale_date, email_subject, email_body)
SELECT 
    (SELECT id FROM platforms WHERE name ILIKE '%Cults%' LIMIT 1),
    (SELECT id FROM email_accounts LIMIT 1), -- Assuming one email account for now
    'Jack Skellington & Sally – Baby Version STL Files for 3D Printing – Adorable Collectible Models',
    2.40,
    'EUR',
    '2025-12-01T16:53:00.000Z',
    'Manual Fix: Missing Sale',
    'Manual insertion to fix missing data'
WHERE NOT EXISTS (
    SELECT 1 FROM sales 
    WHERE product_name LIKE '%Jack Skellington%' 
    AND sale_date = '2025-12-01T16:53:00.000Z'
);

-- 3. Verify/Update existing sales to match exact times if needed (Optional but good for consistency)
UPDATE sales
SET sale_date = '2025-12-01T18:00:00.000Z'
WHERE product_name LIKE '%Little Pollon%' AND sale_date::date = '2025-12-01';

UPDATE sales
SET sale_date = '2025-12-01T09:13:00.000Z'
WHERE product_name LIKE '%Jack Skellington%' AND amount = 2.40 AND sale_date::date = '2025-12-01' AND sale_date != '2025-12-01T16:53:00.000Z';

UPDATE sales
SET sale_date = '2025-12-01T03:41:00.000Z'
WHERE product_name LIKE '%Yeti%' AND sale_date::date = '2025-12-01';
