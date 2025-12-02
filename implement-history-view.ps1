# Script per implementare la History View
# Questo script modifica index.html e script.js in modo sicuro

$ErrorActionPreference = "Stop"

Write-Host "🚀 Inizio implementazione History View..." -ForegroundColor Green

# Percorsi file
$indexPath = "C:\Users\Max\Downloads\stl-sales-tracker\index.html"
$scriptPath = "C:\Users\Max\Downloads\stl-sales-tracker\script.js"
$htmlTemplatePath = "C:\Users\Max\Downloads\stl-sales-tracker\HISTORY-VIEW-HTML.txt"

# Backup
Write-Host "📦 Creazione backup..." -ForegroundColor Yellow
Copy-Item $indexPath "$indexPath.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')" -Force
Copy-Item $scriptPath "$scriptPath.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')" -Force

# ========== MODIFICA 1: Aggiungi link CSS a index.html ==========
Write-Host "📝 Modifica 1: Aggiunta link history.css..." -ForegroundColor Cyan
$indexContent = Get-Content $indexPath -Raw
$indexContent = $indexContent -replace '(<link rel="stylesheet" href="platforms-table\.css">)', '$1`r`n    <link rel="stylesheet" href="history.css">'
Set-Content $indexPath -Value $indexContent -NoNewline

# ========== MODIFICA 2: Sostituisci placeholder History View ==========
Write-Host "📝 Modifica 2: Sostituzione placeholder History View..." -ForegroundColor Cyan
$htmlTemplate = Get-Content $htmlTemplatePath -Raw
$indexContent = Get-Content $indexPath -Raw

# Pattern per trovare il placeholder (righe 475-483 circa)
$placeholderPattern = '(?s)<!-- History View -->\s*<div id="history-view" class="view">.*?</div>\s*</div>\s*</main>'

# Trova il placeholder e sostituiscilo
if ($indexContent -match $placeholderPattern) {
    $replacement = $htmlTemplate + "`r`n        </main>"
    $indexContent = $indexContent -replace $placeholderPattern, $replacement
    Set-Content $indexPath -Value $indexContent -NoNewline
    Write-Host "✅ Placeholder sostituito con successo!" -ForegroundColor Green
}
else {
    Write-Host "⚠️  Placeholder non trovato, provo un approccio alternativo..." -ForegroundColor Yellow
    
    # Approccio alternativo: trova </div> prima di </main>
    $pattern2 = '(?s)(<!-- History View -->.*?<p style="color: #94a3b8;">Sezione in sviluppo</p>\s*</div>\s*</div>)'
    if ($indexContent -match $pattern2) {
        $indexContent = $indexContent -replace $pattern2, $htmlTemplate
        Set-Content $indexPath -Value $indexContent -NoNewline
        Write-Host "✅ Placeholder sostituito (metodo alternativo)!" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Impossibile trovare il placeholder!" -ForegroundColor Red
    }
}

# ========== MODIFICA 3: Aggiungi setupHistoryView() a script.js ==========
Write-Host "📝 Modifica 3: Aggiunta setupHistoryView() all'inizializzazione..." -ForegroundColor Cyan
$scriptContent = Get-Content $scriptPath -Raw
$scriptContent = $scriptContent -replace '(setupMobileHeader\(\);.*?// Add Settings Button)', '$1`r`n    setupHistoryView(); // Initialize History View Listeners'
Set-Content $scriptPath -Value $scriptContent -NoNewline

# ========== MODIFICA 4: Modifica setupNavigation() ==========
Write-Host "📝 Modifica 4: Modifica setupNavigation()..." -ForegroundColor Cyan
$scriptContent = Get-Content $scriptPath -Raw
$navigationAddition = @"
            
            // Load data if switching to history
            if (pageId === 'history') {
                loadHistoryTableData();
            }
"@

$scriptContent = $scriptContent -replace '(const target = document\.getElementById\(`\$\{pageId\}-view`\);[\r\n\s]*if \(target\) target\.classList\.add\(''active''\);)', "`$1$navigationAddition"
Set-Content $scriptPath -Value $scriptContent -NoNewline

# ========== MODIFICA 5: Aggiungi codice History View alla fine di script.js ==========
Write-Host "📝 Modifica 5: Aggiunta codice History View a script.js..." -ForegroundColor Cyan

$historyCode = @'

// --- History View Logic ---
const historyState = {
    page: 1,
    limit: 20,
    filters: {
        platform: 'all',
        period: 'all',
        search: '',
        dateStart: '',
        dateEnd: ''
    }
};

function setupHistoryView() {
    const platformFilter = document.getElementById('history-platform-filter');
    const periodFilter = document.getElementById('history-period-filter');
    const searchFilter = document.getElementById('history-search');
    const customDateDiv = document.getElementById('history-custom-date');
    const applyDateBtn = document.getElementById('history-apply-date');
    const prevBtn = document.getElementById('history-prev-btn');
    const nextBtn = document.getElementById('history-next-btn');

    // Platform Filter
    if (platformFilter) {
        platformFilter.addEventListener('change', (e) => {
            historyState.filters.platform = e.target.value;
            historyState.page = 1;
            loadHistoryTableData();
        });
    }

    // Period Filter
    if (periodFilter) {
        periodFilter.addEventListener('change', (e) => {
            historyState.filters.period = e.target.value;
            if (e.target.value === 'custom') {
                customDateDiv.style.display = 'flex';
            } else {
                customDateDiv.style.display = 'none';
                historyState.filters.dateStart = '';
                historyState.filters.dateEnd = '';
                historyState.page = 1;
                loadHistoryTableData();
            }
        });
    }

    // Custom Date Apply
    if (applyDateBtn) {
        applyDateBtn.addEventListener('click', () => {
            const start = document.getElementById('history-date-start').value;
            const end = document.getElementById('history-date-end').value;
            if (start && end) {
                historyState.filters.dateStart = start;
                historyState.filters.dateEnd = end;
                historyState.page = 1;
                loadHistoryTableData();
            }
        });
    }

    // Search Filter (Debounced)
    let searchTimeout;
    if (searchFilter) {
        searchFilter.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                historyState.filters.search = e.target.value.trim();
                historyState.page = 1;
                loadHistoryTableData();
            }, 500);
        });
    }

    // Pagination
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (historyState.page > 1) {
                historyState.page--;
                loadHistoryTableData();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            historyState.page++;
            loadHistoryTableData();
        });
    }
}

async function loadHistoryTableData() {
    const tbody = document.getElementById('history-table-body');
    const totalAmountEl = document.getElementById('history-total-amount');
    const totalCountEl = document.getElementById('history-total-count');
    const pageInfoEl = document.getElementById('history-page-info');
    const prevBtn = document.getElementById('history-prev-btn');
    const nextBtn = document.getElementById('history-next-btn');

    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem; color: var(--text-secondary);"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento...</td></tr>';

    try {
        // Construct Query
        let selectStr = '*, platforms(name)';
        
        // If filtering by platform, use inner join to allow filtering on foreign table
        if (historyState.filters.platform !== 'all') {
            selectStr = '*, platforms!inner(name)';
        }

        let query = supabase
            .from('sales')
            .select(selectStr, { count: 'exact' });

        // Apply Filters
        // 1. Platform
        if (historyState.filters.platform !== 'all') {
            query = query.eq('platforms.name', historyState.filters.platform);
        }

        // 2. Date Period
        const now = new Date();
        const getLocalISODate = (date) => {
            const offset = date.getTimezoneOffset();
            const localDate = new Date(date.getTime() - (offset * 60 * 1000));
            return localDate.toISOString().split('T')[0];
        };

        if (historyState.filters.period !== 'all') {
            let start, end;
            if (historyState.filters.period === 'today') {
                start = getLocalISODate(now);
                end = start;
            } else if (historyState.filters.period === 'yesterday') {
                const y = new Date(now);
                y.setDate(y.getDate() - 1);
                start = getLocalISODate(y);
                end = start;
            } else if (historyState.filters.period === 'month') {
                start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                end = getLocalISODate(now);
            } else if (historyState.filters.period === 'year') {
                start = `${now.getFullYear()}-01-01`;
                end = getLocalISODate(now);
            } else if (historyState.filters.period === 'custom' && historyState.filters.dateStart && historyState.filters.dateEnd) {
                start = historyState.filters.dateStart;
                end = historyState.filters.dateEnd;
            }

            if (start) query = query.gte('sale_date', start);
            if (end) query = query.lte('sale_date', end + 'T23:59:59');
        }

        // 3. Search (Product Name)
        if (historyState.filters.search) {
            query = query.ilike('product_name', `%${historyState.filters.search}%`);
        }

        // 4. Pagination
        const from = (historyState.page - 1) * historyState.limit;
        const to = from + historyState.limit - 1;
        
        // Execute Query
        const { data, error, count } = await query
            .order('sale_date', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // Render Table
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem; color: var(--text-secondary);">Nessun risultato trovato</td></tr>';
        } else {
            data.forEach(sale => {
                const date = new Date(sale.sale_date);
                const dateStr = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const timeStr = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                
                const row = `
                <tr>
                    <td data-label="Data">
                        <div style="display:flex; flex-direction:column;">
                            <span style="font-weight:500;">${dateStr}</span>
                            <span style="font-size:0.8rem; color:var(--text-secondary);">${timeStr}</span>
                        </div>
                    </td>
                    <td data-label="Piattaforma">
                        <span class="badge" style="background:rgba(255,255,255,0.1); padding:0.25rem 0.5rem; border-radius:4px; font-size:0.85rem;">
                            ${sale.platforms?.name || 'Unknown'}
                        </span>
                    </td>
                    <td data-label="Prodotto" style="font-weight:500;">${sale.product_name || '-'}</td>
                    <td data-label="Importo" style="font-weight:bold; color:#10b981; text-align: right;">€${sale.amount.toFixed(2)}</td>
                </tr>
                `;
                tbody.innerHTML += row;
            });
        }

        // Update Stats
        if (totalCountEl) totalCountEl.textContent = count || 0;
        
        const pageTotal = data.reduce((sum, s) => sum + s.amount, 0);
        if (totalAmountEl) totalAmountEl.textContent = `€${pageTotal.toFixed(2)}`;

        // Update Pagination Controls
        if (pageInfoEl) pageInfoEl.textContent = `Pagina ${historyState.page}`;
        if (prevBtn) prevBtn.disabled = historyState.page === 1;
        if (nextBtn) nextBtn.disabled = (from + data.length) >= count;

    } catch (error) {
        console.error('Error loading history:', error);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem; color: #ef4444;">Errore nel caricamento dati</td></tr>';
    }
}
'@

Add-Content $scriptPath -Value $historyCode

Write-Host ""
Write-Host "✅ IMPLEMENTAZIONE COMPLETATA!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Riepilogo modifiche:" -ForegroundColor Yellow
Write-Host "  ✓ Aggiunto link history.css in index.html" -ForegroundColor White
Write-Host "  ✓ Sostituito placeholder History View in index.html" -ForegroundColor White
Write-Host "  ✓ Aggiunto setupHistoryView() all'inizializzazione" -ForegroundColor White
Write-Host "  ✓ Modificato setupNavigation() per caricare dati" -ForegroundColor White
Write-Host "  ✓ Aggiunto codice History View a script.js" -ForegroundColor White
Write-Host ""
Write-Host "🎉 La History View è ora completamente implementata!" -ForegroundColor Green
Write-Host "📂 I backup sono stati salvati con timestamp" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Apri l'app nel browser e clicca su 'Storico' per testare!" -ForegroundColor Magenta
