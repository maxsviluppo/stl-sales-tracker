-- Verifica se l'email "you have a new order on pixup!" è già stata processata
-- Esegui nel SQL Editor di Supabase

-- 1. Cerca email con subject "you have a new order on pixup!"
SELECT 
    s.id,
    p.name as piattaforma,
    s.product_name,
    s.amount,
    s.currency,
    s.sale_date,
    s.email_subject,
    s.created_at
FROM sales s
JOIN platforms p ON s.platform_id = p.id
WHERE s.email_subject ILIKE '%new order%'
   OR s.email_subject ILIKE '%pixup%'
ORDER BY s.created_at DESC
LIMIT 20;

-- 2. Conta quante vendite hanno lo stesso subject generico
SELECT 
    email_subject,
    COUNT(*) as numero_vendite
FROM sales
WHERE email_subject ILIKE '%order%'
GROUP BY email_subject
ORDER BY numero_vendite DESC;

-- 3. Verifica le vendite Pixup di oggi
SELECT 
    s.product_name,
    s.amount,
    s.sale_date,
    s.email_subject,
    s.created_at
FROM sales s
JOIN platforms p ON s.platform_id = p.id
WHERE p.name ILIKE '%pixup%'
  AND (s.sale_date::date = CURRENT_DATE OR s.created_at::date = CURRENT_DATE)
ORDER BY s.created_at DESC;

-- 4. Verifica TUTTE le vendite delle ultime 48 ore
SELECT 
    p.name as piattaforma,
    s.product_name,
    s.amount,
    s.sale_date,
    s.email_subject,
    s.created_at
FROM sales s
JOIN platforms p ON s.platform_id = p.id
WHERE s.created_at > NOW() - INTERVAL '48 hours'
ORDER BY s.created_at DESC;
