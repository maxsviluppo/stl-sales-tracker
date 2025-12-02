-- ========================================
-- MIGRAZIONE: Prevenzione Duplicati Vendite
-- ========================================
-- Questo script previene l'inserimento di vendite duplicate
-- causate da esecuzioni concorrenti della funzione check-emails
--
-- ISTRUZIONI:
-- 1. Vai su https://supabase.com/dashboard
-- 2. Seleziona il progetto "STL Sales Tracker"
-- 3. Vai su "SQL Editor" nel menu laterale
-- 4. Clicca "New Query"
-- 5. Copia e incolla TUTTO questo script
-- 6. Clicca "Run" (o premi Ctrl+Enter)
-- ========================================

-- Step 1: Rimuovi duplicati esistenti (mantieni il più vecchio)
DELETE FROM sales a
USING sales b
WHERE a.id > b.id
  AND a.email_subject = b.email_subject
  AND a.platform_id = b.platform_id
  AND a.amount = b.amount
  AND a.created_at > b.created_at;

-- Step 2: Aggiungi indice univoco per prevenire futuri duplicati
-- Questo impedisce l'inserimento di vendite con:
-- - Stesso subject email
-- - Stessa piattaforma
-- - Stesso importo
-- - Stessa data/ora esatta
CREATE UNIQUE INDEX IF NOT EXISTS sales_unique_email_exact_idx 
ON sales (email_subject, platform_id, amount, sale_date)
WHERE email_subject IS NOT NULL;

-- Step 3: Verifica il risultato
SELECT 
    'Migrazione completata!' as status,
    COUNT(*) as total_sales,
    COUNT(DISTINCT email_subject) as unique_emails
FROM sales
WHERE email_subject IS NOT NULL;
