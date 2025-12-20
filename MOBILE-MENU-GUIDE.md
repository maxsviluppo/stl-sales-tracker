# Guida: Aggiungere Menu Mobile alla Dashboard

## Modifiche da fare a `index.html`

### 1. Aggiungi il CSS mobile nell'head
Dopo la riga con `<link rel="stylesheet" href="style.css">`, aggiungi:
```html
<link rel="stylesheet" href="mobile-menu.css">
```

### 2. Aggiungi il pulsante hamburger nell'header
Trova questa sezione:
```html
<header class="top-bar">
    <div class="page-title">
```

Sostituiscila con:
```html
<header class="top-bar">
    <button class="mobile-menu-toggle" id="mobile-menu-btn" aria-label="Toggle menu">
        <i class="fa-solid fa-bars"></i>
    </button>
    <div class="page-title">
```

### 3. Aggiungi il JavaScript mobile prima della chiusura del body
Prima di `</body>`, dopo `<script src="script.js"></script>`, aggiungi:
```html
<script src="mobile-menu.js"></script>
```

## Funzionalità del Menu Mobile

- **Hamburger Button**: Appare solo su schermi < 768px
- **Sidebar Slide-in**: Il menu scivola da sinistra
- **Overlay scuro**: Quando il menu è aperto, lo sfondo si scurisce
- **Auto-close**: Il menu si chiude quando:
  - Clicchi sull'overlay
  - Clicchi su una voce del menu
  - Ridimensioni la finestra oltre 768px

## Test

1. Apri la dashboard su mobile o ridimensiona il browser < 768px
2. Clicca sull'icona hamburger (☰)
3. Il menu dovrebbe scivolare da sinistra
4. Clicca fuori dal menu o su una voce per chiuderlo

## Files Creati

- `mobile-menu.css` - Stili per il menu mobile
- `mobile-menu.js` - Logica JavaScript per il menu
- `MOBILE-MENU-GUIDE.md` - Questa guida

## Caricamento su GitHub

Dopo aver fatto le modifiche a `index.html`, carica questi file su GitHub:
1. `index.html` (modificato)
2. `mobile-menu.css` (nuovo)
3. `mobile-menu.js` (nuovo)
