# Configurazione Yahoo Mail per STL Sales Tracker

## Problema
L'account `castro.massimo@yahoo.com` non può usare OAuth2 standard come Gmail. Yahoo richiede una "App Password" specifica.

## Soluzione: Configurare App Password Yahoo

### Passo 1: Genera App Password su Yahoo

1. Vai su [Yahoo Account Security](https://login.yahoo.com/account/security)
2. Accedi con `castro.massimo@yahoo.com`
3. Scorri fino a "App passwords" (Password per app)
4. Clicca su "Generate app password" o "Create app password"
5. Seleziona "Other App" (Altra app)
6. Dai un nome: `STL Sales Tracker`
7. Clicca "Generate"
8. **COPIA LA PASSWORD** (16 caratteri, es: `abcd efgh ijkl mnop`)
   ⚠️ Questa password apparirà solo una volta!

### Passo 2: Converti in formato OAuth-like per il database

Poiché il nostro sistema si aspetta un token OAuth nel campo `imap_host`, dobbiamo creare un oggetto JSON speciale per Yahoo che il checker possa riconoscere.

Esegui questa query SQL nel tuo database Supabase:

```sql
-- Aggiorna l'account Yahoo con la App Password
UPDATE email_accounts
SET imap_host = jsonb_build_object(
    'type', 'yahoo_app_password',
    'app_password', 'LA_TUA_APP_PASSWORD_QUI',  -- Sostituisci con la password generata
    'email', 'castro.massimo@yahoo.com'
)
WHERE email = 'castro.massimo@yahoo.com';
```

### Passo 3: Modifica il gmail-checker per supportare Yahoo

Il file `gmail-checker/index.ts` deve essere aggiornato per:
1. Riconoscere il tipo `yahoo_app_password`
2. Usare IMAP invece di Gmail API per Yahoo
3. Parsare le email in modo simile

**NOTA**: Questa è una soluzione complessa. Un'alternativa più semplice è:

## Alternativa Raccomandata: Inoltro Email

Invece di configurare Yahoo direttamente:

1. Vai su Yahoo Mail Settings
2. Cerca "Forwarding" (Inoltro)
3. Inoltra tutte le email da `castro.massimo@yahoo.com` a uno degli account Gmail già configurati (es: `castromassimo@gmail.com`)
4. In questo modo, le email CGTrader arriveranno su Gmail e verranno processate automaticamente

### Quale metodo preferisci?

**Opzione A**: App Password + Modifica codice (più complesso, 30-60 min)
**Opzione B**: Inoltro email a Gmail (semplice, 2 minuti)

Ti consiglio **Opzione B** per semplicità e affidabilità.

## Istruzioni per Opzione B (Inoltro)

1. Accedi a Yahoo Mail
2. Clicca sull'icona ingranaggio (Settings)
3. Vai su "More Settings" → "Mailboxes"
4. Seleziona l'account `castro.massimo@yahoo.com`
5. Clicca su "Forwarding"
6. Aggiungi l'indirizzo: `castromassimo@gmail.com` (o altro Gmail configurato)
7. Conferma l'email di verifica che Yahoo invierà a Gmail
8. Attiva "Forward all new messages"

Fatto! Ora tutte le email CGTrader arriveranno su Gmail e verranno processate automaticamente.
