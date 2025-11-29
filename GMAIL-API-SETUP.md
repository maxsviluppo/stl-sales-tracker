# Guida Setup Gmail API per STL Sales Tracker

## 🎯 Obiettivo
Automatizzare il controllo delle email di vendita da Gmail usando le API ufficiali di Google.

## 📝 Step 1: Configurazione Google Cloud Console

### 1.1 Crea un Progetto
1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Clicca su "Select a project" in alto
3. Clicca "NEW PROJECT"
4. Nome progetto: `STL Sales Tracker`
5. Clicca "CREATE"

### 1.2 Abilita Gmail API
1. Nel menu a sinistra, vai su **APIs & Services** → **Library**
2. Cerca "Gmail API"
3. Clicca su "Gmail API"
4. Clicca "ENABLE"

### 1.3 Configura OAuth Consent Screen
1. Vai su **APIs & Services** → **OAuth consent screen**
2. Scegli **External** (se non hai Google Workspace)
3. Clicca "CREATE"
4. Compila:
   - **App name**: STL Sales Tracker
   - **User support email**: la tua email
   - **Developer contact**: la tua email
5. Clicca "SAVE AND CONTINUE"
6. **Scopes**: Clicca "ADD OR REMOVE SCOPES"
   - Cerca e aggiungi: `https://www.googleapis.com/auth/gmail.readonly`
   - Clicca "UPDATE"
7. Clicca "SAVE AND CONTINUE"
8. **Test users**: Aggiungi i tuoi 3 account Gmail
   - mysculp3d@gmail.com
   - ispirelab@gmail.com
   - castromassimo@gmail.com
9. Clicca "SAVE AND CONTINUE"

### 1.4 Crea Credenziali OAuth 2.0
1. Vai su **APIs & Services** → **Credentials**
2. Clicca "CREATE CREDENTIALS" → "OAuth client ID"
3. Application type: **Web application**
4. Name: `STL Sales Tracker Web`
5. **Authorized redirect URIs**: Aggiungi:
   - `https://zhgpccmzgyertwnvyiaz.supabase.co/functions/v1/gmail-auth-callback`
6. Clicca "CREATE"
7. **IMPORTANTE**: Copia e salva:
   - **Client ID** (inizia con qualcosa tipo `123456-abc.apps.googleusercontent.com`)
   - **Client Secret** (stringa random)

## ✅ Completato Step 1!
Ora hai le credenziali OAuth. Prossimo step: creare la Edge Function per l'autenticazione.

---

## 📌 Note
- Le credenziali OAuth sono più sicure delle password app
- Ogni account Gmail dovrà autorizzare l'app una volta sola
- L'autorizzazione dura per sempre (a meno che non la revochi)
