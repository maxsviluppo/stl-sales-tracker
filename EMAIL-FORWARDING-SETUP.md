# Guida: Configurazione Email Forwarding

## 🎯 Obiettivo
Inoltrare automaticamente tutte le email dagli account secondari a `mysculp3d@gmail.com`

---

## 📧 Account da Configurare

Devi configurare il forwarding per questi 3 account:
1. `ispirelab@gmail.com` → `mysculp3d@gmail.com`
2. `castromassimo@gmail.com` → `mysculp3d@gmail.com`
3. `castro.massimo@yahoo.com` → `mysculp3d@gmail.com`

---

## 🔧 GMAIL: Setup Forwarding (per ispirelab e castromassimo)

### Per ogni account Gmail (ripeti 2 volte):

1. **Login** all'account (es. `ispirelab@gmail.com`)

2. Clicca sull'**ingranaggio** ⚙️ in alto a destra → **Visualizza tutte le impostazioni**

3. Vai alla tab **Inoltro e POP/IMAP**

4. Clicca su **Aggiungi un indirizzo di inoltro**

5. Inserisci: `mysculp3d@gmail.com`

6. Clicca **Avanti** → **Procedi**

7. **IMPORTANTE**: Ti arriverà un'email su `mysculp3d@gmail.com` con un link di conferma
   - Apri `mysculp3d@gmail.com`
   - Cerca l'email da Gmail (oggetto: "Conferma richiesta di inoltro")
   - Clicca sul link di conferma

8. Torna su `ispirelab@gmail.com` (o `castromassimo@gmail.com`)

9. Nella sezione **Inoltro**, seleziona:
   - ✅ **Inoltra una copia della posta in arrivo a**: `mysculp3d@gmail.com`
   - Scegli: **conserva la copia di Gmail in Posta in arrivo** (così hai backup)

10. Clicca **Salva modifiche** in fondo alla pagina

11. **Opzionale ma Consigliato**: Crea un filtro per inoltrare solo le email delle piattaforme
    - Vai su **Filtri e indirizzi bloccati**
    - Clicca **Crea un nuovo filtro**
    - In "Da" scrivi: `cults3d.com OR cgtrader.com OR 3dexport.com OR pixup`
    - Clicca **Crea filtro**
    - Seleziona: ✅ **Inoltra a** `mysculp3d@gmail.com`
    - Clicca **Crea filtro**

---

## 📮 YAHOO: Setup Forwarding (per castro.massimo@yahoo.com)

1. **Login** a `castro.massimo@yahoo.com`

2. Clicca sull'**ingranaggio** ⚙️ in alto a destra → **Altre impostazioni**

3. Vai su **Caselle di posta**

4. Clicca su **Aggiungi**

5. Inserisci: `mysculp3d@gmail.com`

6. Clicca **Verifica**

7. **IMPORTANTE**: Ti arriverà un'email su `mysculp3d@gmail.com` con un codice
   - Apri `mysculp3d@gmail.com`
   - Cerca l'email da Yahoo
   - Copia il codice di verifica

8. Torna su Yahoo e inserisci il codice

9. Vai su **Impostazioni** → **Filtri**

10. Clicca **Aggiungi nuovo filtro**

11. Configura:
    - Nome filtro: "Vendite STL"
    - Da: contiene `cults3d.com` (ripeti per ogni piattaforma)
    - Azione: **Inoltra a** `mysculp3d@gmail.com`

12. Clicca **Salva**

---

## ✅ Test Finale

Dopo aver configurato tutto:

1. Invia un'email di test da uno degli account secondari a se stesso
2. Verifica che arrivi anche su `mysculp3d@gmail.com`
3. Se arriva → Tutto OK! ✅

---

## 🎯 Prossimo Step

Una volta configurato il forwarding, ti dirò come:
1. Configurare Gmail API solo per `mysculp3d@gmail.com`
2. Aggiornare la Edge Function
3. Testare l'automazione completa!
