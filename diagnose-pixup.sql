-- Verifica configurazione account email e piattaforme
-- Esegui questo nel SQL Editor di Supabase per diagnosticare il problema

-- 1. Verifica che gli account email siano configurati e attivi
SELECT 
    id,
    email,
    provider,
    active,
    last_checked,
    CASE 
        WHEN imap_host IS NULL THEN '❌ NON CONFIGURATO'
        WHEN imap_host LIKE '{%' THEN '✅ Gmail API (OAuth)'
        ELSE '✅ IMAP Tradizionale'
    END as tipo_connessione
FROM email_accounts
ORDER BY active DESC, email;

-- 2. Verifica che Pixup sia configurato correttamente
SELECT 
    id,
    name,
    email_pattern,
    active,
    created_at
FROM platforms
WHERE name = 'Pixup';

-- 3. Verifica se ci sono vendite Pixup esistenti
SELECT 
    COUNT(*) as total_vendite_pixup,
    SUM(amount) as totale_incassi,
    MAX(sale_date) as ultima_vendita
FROM sales s
JOIN platforms p ON s.platform_id = p.id
WHERE p.name = 'Pixup';

-- 4. Verifica le ultime 5 vendite di qualsiasi piattaforma
SELECT 
    p.name as piattaforma,
    s.product_name,
    s.amount,
    s.currency,
    s.sale_date,
    s.email_subject,
    s.created_at
FROM sales s
JOIN platforms p ON s.platform_id = p.id
ORDER BY s.created_at DESC
LIMIT 5;

-- 5. Controlla se l'email Pixup è stata processata (ultimi 3 giorni)
SELECT 
    email_subject,
    product_name,
    amount,
    created_at
FROM sales
WHERE email_subject LIKE '%order%' 
   OR email_subject LIKE '%Congratulations%'
   OR email_subject LIKE '%Pixup%'
ORDER BY created_at DESC
LIMIT 10;
