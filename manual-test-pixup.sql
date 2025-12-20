-- Test: Inserimento manuale vendita Pixup
-- Esegui questo nel SQL Editor di Supabase

-- Prima verifica che Pixup esista
SELECT id, name FROM platforms WHERE name = 'Pixup';

-- Poi inserisci la vendita manualmente
INSERT INTO sales (
    platform_id,
    product_name,
    amount,
    currency,
    sale_date,
    email_subject,
    email_body
)
SELECT 
    p.id,
    'Chibi Panda Mecha Warrior STL File – Armored Panda Robot Suit',
    2.50,
    'USD',
    NOW(),
    'Congratulations! You have a new order',
    'Test manual insert'
FROM platforms p
WHERE p.name = 'Pixup';

-- Verifica che sia stata inserita
SELECT 
    s.id,
    p.name as platform,
    s.product_name,
    s.amount,
    s.currency,
    s.sale_date
FROM sales s
JOIN platforms p ON s.platform_id = p.id
WHERE p.name = 'Pixup'
ORDER BY s.created_at DESC
LIMIT 1;
