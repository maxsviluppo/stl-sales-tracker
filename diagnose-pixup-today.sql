-- =====================================================
-- DIAGNOSI COMPLETA VENDITA PIXUP - 9 Dicembre 2025
-- Esegui questo script nel SQL Editor di Supabase
-- =====================================================

-- 1. VERIFICA ACCOUNT EMAIL mysculp3d@gmail.com
SELECT 
    '1️⃣ STATO ACCOUNT EMAIL' as sezione;
    
SELECT 
    id,
    email,
    active,
    provider,
    last_checked,
    CASE 
        WHEN imap_host IS NULL THEN '❌ NON CONFIGURATO'
        WHEN imap_host LIKE '{%' THEN '✅ Gmail API (OAuth)'
        ELSE '✅ IMAP Tradizionale'
    END as tipo_connessione,
    CASE 
        WHEN imap_host LIKE '%expires_at%' THEN 
            CASE 
                WHEN (imap_host::json->>'expires_at')::bigint > EXTRACT(EPOCH FROM NOW()) * 1000 
                THEN '✅ TOKEN VALIDO'
                ELSE '⚠️ TOKEN SCADUTO'
            END
        ELSE 'N/A'
    END as stato_token
FROM email_accounts
WHERE email = 'mysculp3d@gmail.com';

-- 2. VERIFICA CHE LA PIATTAFORMA PIXUP ESISTA
SELECT 
    '2️⃣ STATO PIATTAFORMA PIXUP' as sezione;
    
SELECT 
    id,
    name,
    email_pattern,
    active
FROM platforms
WHERE LOWER(name) = 'pixup';

-- 3. ULTIME VENDITE PIXUP
SELECT 
    '3️⃣ ULTIME 5 VENDITE PIXUP' as sezione;
    
SELECT 
    s.id,
    s.product_name,
    s.amount,
    s.currency,
    s.sale_date,
    s.email_subject,
    s.created_at
FROM sales s
JOIN platforms p ON s.platform_id = p.id
WHERE LOWER(p.name) = 'pixup'
ORDER BY s.created_at DESC
LIMIT 5;

-- 4. VENDITE DI OGGI DA QUALSIASI PIATTAFORMA
SELECT 
    '4️⃣ VENDITE DI OGGI (tutte le piattaforme)' as sezione;
    
SELECT 
    p.name as piattaforma,
    s.product_name,
    s.amount,
    s.currency,
    s.sale_date,
    s.created_at
FROM sales s
JOIN platforms p ON s.platform_id = p.id
WHERE s.sale_date::date = CURRENT_DATE
   OR s.created_at::date = CURRENT_DATE
ORDER BY s.created_at DESC;

-- 5. CERCA EMAIL GIÀ PROCESSATE CON "Congratulations" O "order"
SELECT 
    '5️⃣ EMAIL PIXUP GIÀ PROCESSATE (ultimi 3 giorni)' as sezione;
    
SELECT 
    email_subject,
    product_name,
    amount,
    created_at
FROM sales
WHERE (
    email_subject ILIKE '%Congratulations%'
    OR email_subject ILIKE '%order%'
    OR email_subject ILIKE '%Pixup%'
    OR email_subject ILIKE '%Labubu%'
    OR email_subject ILIKE '%Unicorn%'
)
AND created_at > NOW() - INTERVAL '3 days'
ORDER BY created_at DESC
LIMIT 10;

-- 6. TUTTI GLI ACCOUNT EMAIL ATTIVI
SELECT 
    '6️⃣ TUTTI GLI ACCOUNT EMAIL ATTIVI' as sezione;
    
SELECT 
    id,
    email,
    active,
    last_checked
FROM email_accounts
WHERE active = true;

-- 7. VERIFICA SE L'EMAIL È STATA SKIPPATA (cerca per subject simile)
SELECT 
    '7️⃣ CERCA SE EMAIL ESISTE CON SUBJECT "Congratulations"' as sezione;
    
SELECT COUNT(*) as totale_congratulations
FROM sales 
WHERE email_subject ILIKE '%Congratulations%';
