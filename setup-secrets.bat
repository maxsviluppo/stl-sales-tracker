@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   STL SALES TRACKER - CONFIGURAZIONE SICUREZZA
echo ===================================================
echo.
echo Questo script ti aiutera' a caricare le password delle app su Supabase.
echo Assicurati di avere le password generate pronte (quelle di 16 caratteri).
echo.

:ASK_EMAIL_1
set /p EMAIL1="Inserisci la PRIMA email (es. mario.rossi@gmail.com): "
if "%EMAIL1%"=="" goto ASK_EMAIL_1
set /p PASS1="Inserisci la PASSWORD APP per %EMAIL1%: "
if "%PASS1%"=="" goto ASK_EMAIL_1

:ASK_EMAIL_2
echo.
set /p EMAIL2="Inserisci la SECONDA email (o premi INVIO per saltare): "
if "%EMAIL2%"=="" goto SKIP_EMAIL_2
set /p PASS2="Inserisci la PASSWORD APP per %EMAIL2%: "
if "%PASS2%"=="" goto ASK_EMAIL_2

:SKIP_EMAIL_2
:ASK_EMAIL_3
echo.
set /p EMAIL3="Inserisci la TERZA email (o premi INVIO per saltare): "
if "%EMAIL3%"=="" goto SKIP_EMAIL_3
set /p PASS3="Inserisci la PASSWORD APP per %EMAIL3%: "
if "%PASS3%"=="" goto ASK_EMAIL_3

:SKIP_EMAIL_3
:ASK_EMAIL_4
echo.
set /p EMAIL4="Inserisci la QUARTA email (o premi INVIO per saltare): "
if "%EMAIL4%"=="" goto SKIP_EMAIL_4
set /p PASS4="Inserisci la PASSWORD APP per %EMAIL4%: "
if "%PASS4%"=="" goto ASK_EMAIL_4

:SKIP_EMAIL_4

echo.
echo ===================================================
echo   INVIO DATI A SUPABASE...
echo ===================================================
echo.

REM Funzione per sanitizzare l'email (sostituisce caratteri speciali con _)
REM Nota: In batch è complesso, facciamo una semplificazione
REM Assumiamo che l'utente inserisca email standard.

REM Costruiamo il comando secrets set
set SECRETS_CMD=npx supabase secrets set

REM Process Email 1
set "SAFE_EMAIL1=%EMAIL1:.=_%"
set "SAFE_EMAIL1=%SAFE_EMAIL1:@=_%"
set "ENV_VAR1=EMAIL_PASSWORD_%SAFE_EMAIL1%"
REM Rimuovi spazi dalla password
set "PASS1=%PASS1: =%"
set "SECRETS_CMD=%SECRETS_CMD% %ENV_VAR1%=%PASS1%"

REM Process Email 2
if not "%EMAIL2%"=="" (
    set "SAFE_EMAIL2=%EMAIL2:.=_%"
    set "SAFE_EMAIL2=%SAFE_EMAIL2:@=_%"
    set "ENV_VAR2=EMAIL_PASSWORD_%SAFE_EMAIL2%"
    set "PASS2=%PASS2: =%"
    set "SECRETS_CMD=!SECRETS_CMD! !ENV_VAR2!=!PASS2!"
)

REM Process Email 3
if not "%EMAIL3%"=="" (
    set "SAFE_EMAIL3=%EMAIL3:.=_%"
    set "SAFE_EMAIL3=%SAFE_EMAIL3:@=_%"
    set "ENV_VAR3=EMAIL_PASSWORD_%SAFE_EMAIL3%"
    set "PASS3=%PASS3: =%"
    set "SECRETS_CMD=!SECRETS_CMD! !ENV_VAR3!=!PASS3!"
)

REM Process Email 4
if not "%EMAIL4%"=="" (
    set "SAFE_EMAIL4=%EMAIL4:.=_%"
    set "SAFE_EMAIL4=%SAFE_EMAIL4:@=_%"
    set "ENV_VAR4=EMAIL_PASSWORD_%SAFE_EMAIL4%"
    set "PASS4=%PASS4: =%"
    set "SECRETS_CMD=!SECRETS_CMD! !ENV_VAR4!=!PASS4!"
)

echo Eseguo comando: %SECRETS_CMD% (Password nascoste)
echo.

call %SECRETS_CMD%

echo.
if %ERRORLEVEL% EQU 0 (
    echo [OK] Password caricate con successo!
) else (
    echo [ERRORE] Qualcosa e' andato storto. Controlla di aver fatto il login.
)

pause
