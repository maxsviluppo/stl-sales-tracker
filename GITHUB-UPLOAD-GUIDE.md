# 📦 File da Caricare su GitHub - STL Sales Tracker

## ✅ File Modificati (Principali)

### 🎯 Core Application Files

1. **script.js** ⭐ IMPORTANTE
   - Riscritto completamente per risolvere errori di sintassi
   - Fix timezone: usa date locali (CET) invece di UTC
   - Contatori giornalieri si azzerano correttamente a mezzanotte locale
   - Nessuna funzione duplicata
   - Codice pulito e ben organizzato

2. **mobile-header.css** ⭐ NUOVO
   - Header mobile con nome app "STL Tracker" in verde
   - Font size aumentato (2rem)
   - Layout a griglia ottimizzato
   - Nasconde il titolo pagina su mobile

3. **mobile-sales.css** ⭐ NUOVO
   - Tabella vendite compatta su mobile
   - Layout a singola riga invece di card
   - Attributi data-label per accessibilità
   - Prezzo in verde e ben visibile

4. **index.html**
   - Link ai nuovi CSS mobile aggiunti:
     - `mobile-sales.css`
     - `mobile-header.css`
   - Struttura HTML invariata

5. **supabase-config.js**
   - Nessuna modifica (già corretto)

### 🗄️ Database Migrations

6. **prevent-duplicate-sales.sql** ⭐ NUOVO
   - Aggiunge UNIQUE INDEX per prevenire duplicati
   - Rimuove duplicati esistenti
   - Previene race conditions nelle email checks

### 📁 Edge Functions

7. **supabase/functions/check-emails/index.ts**
   - Fix imports Deno (npm: prefix)
   - Controllo duplicati migliorato
   - Fix timezone per sale_date
   - Gestione errori migliorata

## 📋 File da NON Caricare (Backup/Temporanei)

- `*.backup` - File di backup
- `*.json` - Output di test
- `*.sql` (eccetto prevent-duplicate-sales.sql) - Script di test/fix temporanei
- `setup-secrets.bat` - Contiene credenziali sensibili

## 🚀 Comandi Git per Caricare

```bash
# 1. Vai nella directory del progetto
cd c:\Users\Max\Downloads\stl-sales-tracker

# 2. Controlla lo stato
git status

# 3. Aggiungi i file modificati
git add script.js
git add mobile-header.css
git add mobile-sales.css
git add index.html
git add prevent-duplicate-sales.sql
git add supabase/functions/check-emails/index.ts

# 4. Commit con messaggio descrittivo
git commit -m "Fix: Timezone handling, mobile UI improvements, prevent duplicates

- Rewrite script.js with proper timezone handling (local time)
- Add mobile-header.css for improved mobile header layout
- Add mobile-sales.css for compact mobile sales table
- Add unique index to prevent duplicate sales from concurrent checks
- Fix check-emails function imports and duplicate detection"

# 5. Push su GitHub
git push origin main
```

## 📝 Note Importanti

### Modifiche Principali:
1. **Timezone Fix**: Le statistiche giornaliere ora usano il fuso orario locale (CET/UTC+1) invece di UTC
2. **Mobile UI**: Header e tabella vendite ottimizzati per mobile
3. **Duplicati**: Indice univoco nel DB previene inserimenti duplicati

### Cosa Aspettarsi:
- ✅ Contatore vendite si azzera a mezzanotte locale (non UTC)
- ✅ Vendite delle 00:47 (CET) contate come "oggi" (2 Dicembre)
- ✅ Nome app "STL Tracker" grande e verde su mobile
- ✅ Tabella vendite compatta su mobile
- ✅ Nessun duplicato anche con esecuzioni concorrenti

### Database Migration:
Dopo il push, esegui la migrazione sul database di produzione:
```sql
-- Esegui questo SQL su Supabase Dashboard
-- (già eseguito sul tuo DB, ma per riferimento)
CREATE UNIQUE INDEX IF NOT EXISTS sales_unique_email_exact_idx 
ON sales (email_subject, platform_id, amount, sale_date)
WHERE email_subject IS NOT NULL;
```

## 🔄 Verifica Post-Deploy

Dopo il caricamento su GitHub:
1. Verifica che i file siano visibili su GitHub
2. Controlla che non ci siano errori di sintassi
3. Testa l'app in locale dopo un `git pull`
4. Verifica che il contatore giornaliero funzioni correttamente

---
**Data Ultima Modifica**: 2025-12-02 07:33 CET
**Versione**: 2.0 (Timezone Fix + Mobile UI)
