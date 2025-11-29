-- Inserimento Account Email Reali
-- Esegui questo script nel SQL Editor di Supabase

-- Prima rimuoviamo gli account finti (se esistono)
DELETE FROM email_accounts WHERE email LIKE '%your-%';

-- Inseriamo i tuoi 4 account email veri
INSERT INTO email_accounts (email, provider, imap_host, imap_port, active) VALUES
    ('mysculp3d@gmail.com', 'gmail', 'imap.gmail.com', 993, true),
    ('ispirelab@gmail.com', 'gmail', 'imap.gmail.com', 993, true),
    ('castromassimo@gmail.com', 'gmail', 'imap.gmail.com', 993, true),
    ('castro.massimo@yahoo.com', 'yahoo', 'imap.mail.yahoo.com', 993, true)
ON CONFLICT (email) DO UPDATE SET
    active = true,
    imap_host = EXCLUDED.imap_host,
    imap_port = EXCLUDED.imap_port,
    provider = EXCLUDED.provider;

-- Verifica che siano stati inseriti correttamente
SELECT * FROM email_accounts;
