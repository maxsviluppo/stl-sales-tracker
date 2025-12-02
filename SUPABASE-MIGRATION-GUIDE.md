# 🗄️ GUIDA: Applicare Migrazione Anti-Duplicati su Supabase

## 📍 Link Diretti Supabase

### 1️⃣ **Dashboard Principale**
🔗 https://supabase.com/dashboard

### 2️⃣ **SQL Editor (Esegui Query)**
🔗 https://supabase.com/dashboard/project/zhgpccmzgyertwnvyiaz/sql

### 3️⃣ **Database Tables (Verifica Dati)**
🔗 https://supabase.com/dashboard/project/zhgpccmzgyertwnvyiaz/editor

---

## 🚀 PROCEDURA PASSO-PASSO

### **Opzione A: Via Web Interface (Consigliata)**

1. **Apri SQL Editor**
   - Clicca qui: https://supabase.com/dashboard/project/zhgpccmzgyertwnvyiaz/sql
   - Oppure: Dashboard → SQL Editor (nel menu laterale)

2. **Crea Nuova Query**
   - Clicca il pulsante "+ New Query" in alto a sinistra

3. **Copia lo Script SQL**
   - Apri il file: `SUPABASE-MIGRATION-DUPLICATES.sql`
   - Seleziona TUTTO il contenuto (Ctrl+A)
   - Copia (Ctrl+C)

4. **Incolla ed Esegui**
   - Incolla nel SQL Editor (Ctrl+V)
   - Clicca "Run" (o premi Ctrl+Enter)
   - Attendi il completamento (circa 1-2 secondi)

5. **Verifica il Risultato**
   - Dovresti vedere un messaggio: "Migrazione completata!"
   - Controlla il numero di vendite totali

---

### **Opzione B: Copia-Incolla Rapido**

**Copia questo script e incollalo direttamente nel SQL Editor:**

```sql
-- Rimuovi duplicati esistenti
DELETE FROM sales a
USING sales b
WHERE a.id > b.id
  AND a.email_subject = b.email_subject
  AND a.platform_id = b.platform_id
  AND a.amount = b.amount
  AND a.created_at > b.created_at;

-- Aggiungi indice univoco
CREATE UNIQUE INDEX IF NOT EXISTS sales_unique_email_exact_idx 
ON sales (email_subject, platform_id, amount, sale_date)
WHERE email_subject IS NOT NULL;

-- Verifica
SELECT 
    'Migrazione completata!' as status,
    COUNT(*) as total_sales
FROM sales;
```

---

## ✅ VERIFICA POST-MIGRAZIONE

Dopo aver eseguito lo script:

### 1. **Controlla l'Output**
Dovresti vedere qualcosa tipo:
```
status: "Migrazione completata!"
total_sales: 5
unique_emails: 4
```

### 2. **Verifica Indice Creato**
- Vai su: https://supabase.com/dashboard/project/zhgpccmzgyertwnvyiaz/database/indexes
- Cerca: `sales_unique_email_exact_idx`
- Stato: ✅ Active

### 3. **Testa la Prevenzione Duplicati**
Prova a eseguire due volte il check-email:
- Le vendite NON dovrebbero duplicarsi
- Se provi a inserire manualmente un duplicato, riceverai un errore (questo è corretto!)

---

## 🔧 TROUBLESHOOTING

### ❌ Errore: "permission denied"
**Soluzione**: Assicurati di essere loggato come owner del progetto

### ❌ Errore: "relation does not exist"
**Soluzione**: Verifica di essere nel progetto corretto (zhgpccmzgyertwnvyiaz)

### ❌ Errore: "index already exists"
**Soluzione**: La migrazione è già stata applicata! Tutto ok ✅

---

## 📊 COSA FA QUESTA MIGRAZIONE

### Prima della Migrazione:
- ❌ Email processata 2 volte → 2 vendite duplicate
- ❌ Check-email concorrenti → duplicati
- ❌ Nessuna protezione a livello DB

### Dopo la Migrazione:
- ✅ Email processata 2 volte → 1 vendita (duplicato bloccato)
- ✅ Check-email concorrenti → nessun duplicato
- ✅ Protezione a livello DB (UNIQUE INDEX)

### Regola Applicata:
**NON POSSONO ESISTERE 2 VENDITE CON:**
- Stesso `email_subject`
- Stessa `platform_id`
- Stesso `amount`
- Stessa `sale_date` (timestamp esatto)

---

## 📝 NOTE IMPORTANTI

1. **Questa migrazione è SICURA**
   - Rimuove solo duplicati ESATTI
   - Mantiene sempre la vendita più vecchia
   - Non tocca vendite legittime

2. **È IDEMPOTENTE**
   - Puoi eseguirla più volte senza problemi
   - Se l'indice esiste già, viene ignorato

3. **Effetto Immediato**
   - Dopo l'esecuzione, i duplicati sono impossibili
   - Funziona anche con esecuzioni concorrenti

---

## 🎯 PROSSIMI PASSI

Dopo aver applicato la migrazione:

1. ✅ Testa il check-email manualmente
2. ✅ Verifica che non ci siano più duplicati
3. ✅ Carica il file su GitHub per documentazione
4. ✅ Rilassati, il problema è risolto! 🎉

---

**Creato**: 2025-12-02 07:46 CET
**Progetto**: zhgpccmzgyertwnvyiaz
**File SQL**: SUPABASE-MIGRATION-DUPLICATES.sql
