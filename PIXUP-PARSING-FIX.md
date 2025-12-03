# Fix Parsing Vendite Pixup ✅

## Problema Risolto
Le vendite di Pixup non venivano rilevate correttamente perché i pattern regex non matchavano il formato delle email.

## Formato Email Pixup
```
Congratulations !
You have a new order.
Product	Price
Chibi Panda Mecha Warrior STL File – Armored Panda Robot Suit - STL From Designer	$2.50
Total Price:	$2.50
```

## Modifiche Apportate

### 1. `supabase/functions/gmail-checker/index.ts` (righe 185-203)
**Migliorato il parsing per:**
- Estrarre il nome del prodotto dalla riga che contiene `"- STL From Designer"`
- Gestire il fallback se il pattern principale non matcha
- Estrarre correttamente il prezzo da `"Total Price: $X.XX"`

### 2. `supabase/functions/check-emails/index.ts` (righe 118-137)
**Stesso miglioramento applicato** per mantenere coerenza tra le due funzioni.

## Come Testare

### Opzione 1: Test Manuale (Consigliato)
1. Invia un'email di test a uno dei tuoi account Gmail configurati
2. Usa il formato esatto dell'email Pixup
3. Clicca su "Controlla Email" nell'app
4. Verifica che la vendita venga registrata correttamente

### Opzione 2: Deploy e Test Live
```bash
# 1. Deploy delle funzioni aggiornate
supabase functions deploy gmail-checker
supabase functions deploy check-emails

# 2. Testa la funzione gmail-checker
curl -X POST https://zhgpccmzgyertwnvyiaz.supabase.co/functions/v1/gmail-checker \
  -H "Authorization: Bearer YOUR_SUPABASE_KEY" \
  -H "Content-Type: application/json"
```

### Opzione 3: Inserimento Manuale per Test
```sql
-- Inserisci una vendita Pixup di test
INSERT INTO sales (platform_id, product_name, amount, currency, sale_date)
VALUES (
  (SELECT id FROM platforms WHERE name = 'Pixup'),
  'Chibi Panda Mecha Warrior STL File – Armored Panda Robot Suit',
  2.50,
  'USD',
  NOW()
);
```

## Pattern Regex Aggiornati

### Estrazione Nome Prodotto
```regex
/Product\s+Price\s+(.+?)\s+-\s+STL\s+From\s+Designer/i
```
**Match:** `"Chibi Panda Mecha Warrior STL File – Armored Panda Robot Suit"`

### Fallback Nome Prodotto
```regex
/Product\s+Price\s+([^\n]+)/i
```
Poi rimuove il prezzo e il suffisso "- STL"

### Estrazione Prezzo
```regex
/Total\s+Price:\s*\$\s*(\d+[.,]\d{2})/i
```
**Match:** `"$2.50"` → `2.50`

## Verifica Funzionamento

### Controlla i Log
Quando clicchi "Controlla Email", la funzione dovrebbe loggare:
```
📧 Email #1:
  From: noreply@pixup3d.com
  Subject: Congratulations! You have a new order
  Platform: Pixup
  Extracted: Chibi Panda Mecha Warrior STL File – Armored Panda Robot Suit | USD 2.50
✅ INSERTED: Chibi Panda Mecha Warrior... (USD 2.50)
```

### Controlla il Database
```sql
-- Verifica le vendite Pixup
SELECT 
  s.product_name,
  s.amount,
  s.currency,
  s.sale_date,
  p.name as platform
FROM sales s
JOIN platforms p ON s.platform_id = p.id
WHERE p.name = 'Pixup'
ORDER BY s.sale_date DESC
LIMIT 10;
```

## Prossimi Passi

1. **Deploy delle funzioni** (se non già fatto)
2. **Test con email reale** di Pixup
3. **Verifica che la vendita appaia** nella dashboard
4. **Controlla i log** per eventuali errori

## Note Importanti

- Le funzioni Edge sono già configurate per gestire sia Gmail API (`gmail-checker`) che IMAP tradizionale (`check-emails`)
- Il parsing è case-insensitive per maggiore robustezza
- I caratteri speciali (tab, newline) vengono gestiti correttamente
- Il fallback garantisce che anche se il formato cambia leggermente, il parsing funzioni

## Supporto

Se le vendite Pixup non vengono ancora rilevate:
1. Controlla i log della funzione Edge
2. Verifica che l'email pattern nel database sia corretto: `pixup3d.com`
3. Assicurati che gli account email siano configurati e attivi
4. Controlla che le credenziali Gmail API siano valide
