-- Insert manual sale: CGTrader - Ghost in the Shell Inspired STL Major Motoko Kusanagi
-- Date: 2025-11-29 (yesterday)
-- Amount: $3.50 USD

-- First, get the platform ID for CGTrader
DO $$
DECLARE
    platform_id_var UUID;
BEGIN
    -- Get CGTrader platform ID
    SELECT id INTO platform_id_var FROM platforms WHERE name = 'CGTrader';
    
    -- Insert the sale
    INSERT INTO sales (
        platform_id,
        product_name,
        amount,
        currency,
        sale_date
    ) VALUES (
        platform_id_var,
        'Ghost in the Shell Inspired STL Major Motoko Kusanagi',
        3.50,
        'USD',
        '2025-11-29 12:00:00'::timestamp
    );
    
    RAISE NOTICE 'Sale inserted successfully!';
END $$;

-- Verify the insertion
SELECT 
    s.sale_date,
    p.name as platform,
    s.product_name,
    s.amount,
    s.currency
FROM sales s
JOIN platforms p ON s.platform_id = p.id
WHERE s.product_name LIKE '%Ghost in the Shell%'
ORDER BY s.sale_date DESC
LIMIT 1;
