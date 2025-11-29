-- Fix: Allarga il campo imap_host per contenere i token OAuth
-- Esegui questo nel SQL Editor di Supabase

ALTER TABLE email_accounts 
ALTER COLUMN imap_host TYPE TEXT;

-- Verifica
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'email_accounts' AND column_name = 'imap_host';
