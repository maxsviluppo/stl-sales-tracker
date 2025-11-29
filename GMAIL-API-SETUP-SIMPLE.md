# Gmail API Setup - Test Pilota (Solo mysculp3d@gmail.com)

## 🎯 Obiettivo
Configurare Gmail API per UN SOLO account come test.

---

## 📝 STEP 1: Google Cloud Console

### 1.1 Crea Progetto
1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Clicca "Select a project" in alto
3. Clicca "NEW PROJECT"
4. Nome: `STL Sales Tracker`
5. Clicca "CREATE"
6. Aspetta che il progetto venga creato (30 secondi)

### 1.2 Abilita Gmail API
1. Assicurati che il progetto "STL Sales Tracker" sia selezionato in alto
2. Menu ☰ → **APIs & Services** → **Library**
3. Cerca "Gmail API"
4. Clicca su "Gmail API"
5. Clicca **ENABLE**

### 1.3 Configura OAuth Consent Screen
1. Menu ☰ → **APIs & Services** → **OAuth consent screen**
2. Scegli **External**
3. Clicca "CREATE"

**App information:**
- App name: `STL Sales Tracker`
- User support email: `mysculp3d@gmail.com`
- App logo: (lascia vuoto)

**Developer contact information:**
- Email: `mysculp3d@gmail.com`

4. Clicca "SAVE AND CONTINUE"

**Scopes:**
5. Clicca "ADD OR REMOVE SCOPES"
6. Nella barra di ricerca scrivi: `gmail.readonly`
7. Seleziona: ✅ `https://www.googleapis.com/auth/gmail.readonly`
8. Clicca "UPDATE"
9. Clicca "SAVE AND CONTINUE"

**Test users:**
10. Clicca "ADD USERS"
11. Inserisci: `mysculp3d@gmail.com`
12. Clicca "ADD"
13. Clicca "SAVE AND CONTINUE"
14. Clicca "BACK TO DASHBOARD"

### 1.4 Crea Credenziali OAuth
1. Menu ☰ → **APIs & Services** → **Credentials**
2. Clicca "CREATE CREDENTIALS" → "OAuth client ID"
3. Application type: **Web application**
4. Name: `STL Tracker Web Client`

**Authorized redirect URIs:**
5. Clicca "ADD URI"
6. Inserisci ESATTAMENTE: `https://zhgpccmzgyertwnvyiaz.supabase.co/functions/v1/gmail-callback`
7. Clicca "CREATE"

**📋 IMPORTANTE - COPIA QUESTI DATI:**
8. Apparirà un popup con:
   - **Client ID**: (tipo `123456789-abc123.apps.googleusercontent.com`)
   - **Client secret**: (tipo `GOCSPX-abc123xyz`)

9. **COPIA E INCOLLA QUI SOTTO** (o salvali in un file temporaneo):

```
Client ID: [INCOLLA QUI]
Client Secret: [INCOLLA QUI]
```

10. Clicca "OK"

---

## ✅ Completato!

Quando hai copiato Client ID e Client Secret, **scrivimi qui** e ti do il codice della Edge Function! 🚀

**NON chiudere la pagina di Google Cloud Console**, potrebbe servirti dopo!
