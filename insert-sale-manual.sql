-- Script per inserire manualmente le vendite
-- Usa questo script quando ricevi una nuova email di vendita

-- ESEMPIO: Vendita Cults3D
-- Sostituisci i valori tra apici con i dati della tua email
INSERT INTO sales (platform_id, email_account_id, product_name, amount, currency, sale_date, email_subject)
VALUES (
  '3c9ffe57-ef58-422c-a005-3793a3d8efbb',  -- Cults3D
  'da2b583c-e134-440f-93de-42b509d341fc',  -- mysculp3d@gmail.com
  'NOME_PRODOTTO',  -- Sostituisci con il nome del prodotto
  2.80,  -- Sostituisci con il tuo guadagno (Your income)
  'EUR',
  NOW(),
  'Subject dell email'  -- Sostituisci con il subject
);

-- ESEMPIO: Vendita Pixup
INSERT INTO sales (platform_id, email_account_id, product_name, amount, currency, sale_date, email_subject)
VALUES (
  '5a23c5cc-b9c3-4465-b9e6-736d0b0a9e51',  -- Pixup
  'da2b583c-e134-440f-93de-42b509d341fc',  -- mysculp3d@gmail.com
  'NOME_PRODOTTO',
  2.00,  -- Total Price in USD
  'USD',
  NOW(),
  'Subject dell email'
);

-- RIFERIMENTO RAPIDO:
-- Platform IDs:
--   Cults3D:  3c9ffe57-ef58-422c-a005-3793a3d8efbb
--   Pixup:    5a23c5cc-b9c3-4465-b9e6-736d0b0a9e51
--   CGTrader: f3c22cd1-c682-4bd2-bd21-3bd429c8cb4c
--   3DExport: ba3333f5-7c81-4fb7-b640-22a3e564c909

-- Email Account IDs:
--   mysculp3d@gmail.com:      da2b583c-e134-440f-93de-42b509d341fc
--   ispirelab@gmail.com:      fe65e699-e5ba-4234-9bcd-1c5346298f22
--   castromassimo@gmail.com:  42265a0b-cfa4-40e6-8fbf-877d8cc8c148
