-- =====================================================
-- MIGRATION: Aggiunta campo gmail_message_id
-- Esegui questo script nel SQL Editor di Supabase PRIMA di fare il deploy
-- =====================================================

-- 1. Aggiungi la colonna gmail_message_id alla tabella sales
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS gmail_message_id TEXT;

-- 2. Crea un indice per velocizzare le ricerche
CREATE INDEX IF NOT EXISTS idx_sales_gmail_message_id 
ON sales(gmail_message_id);

-- 3. Verifica che la colonna sia stata aggiunta
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sales' 
AND column_name = 'gmail_message_id';

-- Output atteso: gmail_message_id | text
