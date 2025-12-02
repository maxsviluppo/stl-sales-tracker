# 📦 LISTA FILE DA CARICARE SU GITHUB

## ✅ File Modificati da Caricare

### 1. **script.js** ⭐⭐⭐ CRITICO
**Percorso**: `script.js`
**Modifiche**: 
- Riscritto completamente
- Fix timezone in TUTTE le funzioni (loadStats, loadTopPlatforms, loadChartData)
- Usa date locali (CET) invece di UTC
- Rimosse funzioni duplicate
- Codice pulito e funzionante
- **IMPORTANTE**: Ora CGTrader appare correttamente nelle Top Platforms!

### 2. **mobile-header.css** ⭐⭐ NUOVO
**Percorso**: `mobile-header.css`
**Modifiche**:
- Nome app "STL Tracker" verde e grande
- Layout header mobile ottimizzato
- Nasconde titolo pagina su mobile

### 3. **mobile-sales.css** ⭐⭐ NUOVO
**Percorso**: `mobile-sales.css`
**Modifiche**:
- Tabella vendite compatta su mobile
- Layout a singola riga
- Prezzo verde e visibile

### 4. **table-compact.css** ⭐⭐ NUOVO
**Percorso**: `table-compact.css`
**Modifiche**:
- Layout compatto per data/ora (incolonnati)
- Ottimizzazione spazi tabella

### 5. **index.html** ⭐
**Percorso**: `index.html`
**Modifiche**:
- Aggiunti link ai nuovi CSS mobile (righe 15-17)

### 5. **prevent-duplicate-sales.sql** ⭐ NUOVO
**Percorso**: `prevent-duplicate-sales.sql`
**Modifiche**:
- Script SQL per prevenire duplicati
- Da eseguire manualmente su Supabase

### 6. **supabase/functions/check-emails/index.ts** ⭐
**Percorso**: `supabase/functions/check-emails/index.ts`
**Modifiche**:
- Fix imports Deno (npm: prefix)
- Migliorato controllo duplicati
- Fix timezone

### 7. **.gitignore** ⭐ NUOVO
**Percorso**: `.gitignore`
**Modifiche**:
- Esclude file backup e temporanei

### 8. **GITHUB-UPLOAD-GUIDE.md** 📝 NUOVO
**Percorso**: `GITHUB-UPLOAD-GUIDE.md`
**Modifiche**:
- Documentazione per upload

---

## 🚫 File da NON Caricare

- `script.js.backup`
- `index.html.backup`
- `index.html.backup2`
- `style.css.backup`
- Tutti i file `*.json` (output di test)
- Tutti i file `fix-*.sql`, `insert-*.sql`, `remove-*.sql`
- `setup-secrets.bat` (contiene credenziali)

---

## 📋 ISTRUZIONI CARICAMENTO

### Opzione A: GitHub Desktop (Consigliato)

1. Apri GitHub Desktop
2. Seleziona il repository "stl-sales-tracker"
3. Vedrai i file modificati nella lista
4. Seleziona SOLO questi file:
   - ✅ script.js
   - ✅ mobile-header.css
   - ✅ mobile-sales.css
   - ✅ table-compact.css
   - ✅ index.html
   - ✅ prevent-duplicate-sales.sql
   - ✅ .gitignore
   - ✅ GITHUB-UPLOAD-GUIDE.md
   - ✅ supabase/functions/check-emails/index.ts

5. Scrivi il messaggio di commit:
   ```
   Fix: Timezone handling, mobile UI, prevent duplicates
   
   - Rewrite script.js with local timezone handling
   - Add mobile-header.css and mobile-sales.css
   - Add unique index to prevent duplicate sales
   - Update check-emails function
   ```

6. Clicca "Commit to main"
7. Clicca "Push origin"

### Opzione B: GitHub Web Interface

1. Vai su https://github.com/TUO_USERNAME/stl-sales-tracker
2. Per ogni file:
   - Clicca sul file
   - Clicca "Edit" (icona matita)
   - Copia il contenuto dal file locale
   - Incolla nel web editor
   - Clicca "Commit changes"

### Opzione C: Git Command Line (se installato)

```bash
cd c:\Users\Max\Downloads\stl-sales-tracker

git add script.js
git add mobile-header.css
git add mobile-sales.css
git add index.html
git add prevent-duplicate-sales.sql
git add .gitignore
git add GITHUB-UPLOAD-GUIDE.md
git add supabase/functions/check-emails/index.ts

git commit -m "Fix: Timezone handling, mobile UI, prevent duplicates"

git push origin main
```

---

## ✅ VERIFICA POST-UPLOAD

Dopo il caricamento:

1. Vai su GitHub e verifica che i file siano aggiornati
2. Controlla la data dell'ultimo commit
3. Verifica che non ci siano errori di sintassi evidenziati
4. Se hai un deployment automatico (Vercel/Netlify), attendi il deploy

---

## 🗄️ MIGRAZIONE DATABASE

Dopo l'upload, esegui questa migrazione su Supabase:

1. Vai su https://supabase.com/dashboard
2. Seleziona il progetto "STL Sales Tracker"
3. Vai su "SQL Editor"
4. Copia e incolla il contenuto di `prevent-duplicate-sales.sql`
5. Clicca "Run"

Oppure usa il comando MCP (se disponibile):
```
mcp0_apply_migration con il contenuto del file
```

---

**Creato**: 2025-12-02 07:33 CET
**Versione App**: 2.0
