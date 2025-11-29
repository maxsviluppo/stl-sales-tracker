-- Script di Pulizia - Rimuove i dati di test
-- Esegui questo nel SQL Editor di Supabase

-- Cancella tutte le vendite di test
DELETE FROM sales;

-- Verifica che le piattaforme siano ancora presenti
SELECT * FROM platforms;

-- Verifica che gli account email siano ancora presenti
SELECT * FROM email_accounts;

-- Fatto! Ora la dashboard sarà pulita e pronta per le tue vendite reali.
