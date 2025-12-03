-- Test manuale per verificare il parsing di Pixup
-- Esegui questo nel SQL Editor di Supabase

-- 1. Verifica che la piattaforma Pixup esista
SELECT * FROM platforms WHERE name = 'Pixup';
-- Dovrebbe mostrare: name='Pixup', email_pattern='pixup3d.com', active=true

-- 2. Inserisci una vendita di test Pixup
INSERT INTO sales (
    platform_id, 
    product_name, 
    amount, 
    currency, 
    sale_date,
    email_subject,
    email_body
)
VALUES (
    (SELECT id FROM platforms WHERE name = 'Pixup'),
    'Chibi Panda Mecha Warrior STL File – Armored Panda Robot Suit',
    2.50,
    'USD',
    NOW(),
    'Congratulations! You have a new order',
    'Product Price Chibi Panda Mecha Warrior STL File – Armored Panda Robot Suit - STL From Designer $2.50 Total Price: $2.50'
);

-- 3. Verifica che la vendita sia stata inserita
SELECT 
    s.id,
    p.name as platform,
    s.product_name,
    s.amount,
    s.currency,
    s.sale_date,
    s.created_at
FROM sales s
JOIN platforms p ON s.platform_id = p.id
WHERE p.name = 'Pixup'
ORDER BY s.created_at DESC
LIMIT 5;

-- 4. Verifica le statistiche Pixup
SELECT 
    p.name as platform,
    COUNT(*) as total_sales,
    SUM(s.amount) as total_amount,
    s.currency
FROM sales s
JOIN platforms p ON s.platform_id = p.id
WHERE p.name = 'Pixup'
GROUP BY p.name, s.currency;

-- 5. (OPZIONALE) Rimuovi la vendita di test
-- Decommentare solo se vuoi rimuovere il test
-- DELETE FROM sales 
-- WHERE product_name = 'Chibi Panda Mecha Warrior STL File – Armored Panda Robot Suit'
-- AND amount = 2.50;
