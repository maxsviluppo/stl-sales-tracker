// ISTRUZIONI PER L'INTEGRAZIONE DELLA HISTORY VIEW
// ================================================
//
// Questo file contiene tutto il codice necessario per implementare la History View.
// Segui questi passaggi:
//
// 1. MODIFICA index.html:
//    - Aggiungi <link rel="stylesheet" href="history.css"> dopo platforms-table.css
//    - Sostituisci il placeholder della History View (righe 475-483) con il codice HTML fornito sotto
//
// 2. MODIFICA script.js:
//    - Aggiungi setupHistoryView() alla chiamata in DOMContentLoaded (riga 23)
//    - Modifica setupNavigation() per caricare i dati quando si clicca su History
//    - Aggiungi tutto il codice JavaScript fornito sotto alla fine del file

// ========== CODICE HTML PER index.html ==========
// Sostituisci le righe 475-483 con questo:

/*
            <!-- History View -->
            <div id="history-view" class="view">
                <!-- Filters -->
                <div class="glass" style="padding: 1.5rem; margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
                        <h2 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fa-solid fa-clock-rotate-left" style="color: #10b981;"></i>
                            Storico Vendite
                        </h2>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <span style="font-weight: 600; color: var(--text-secondary);">Totale:</span>
                            <span id="history-total-count" style="font-weight: 700; color: #10b981;">0</span>
                            <span style="color: var(--text-secondary);">vendite</span>
                            <span style="margin-left: 1rem; font-weight: 600; color: var(--text-secondary);">|</span>
                            <span id="history-total-amount" style="font-weight: 700; color: #10b981; margin-left: 0.5rem;">€0.00</span>
                        </div>
                    </div>

                    <!-- Filter Controls -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <!-- Platform Filter -->
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.9rem;">
                                <i class="fa-solid fa-layer-group"></i> Piattaforma
                            </label>
                            <select id="history-platform-filter" style="width: 100%; background: var(--bg-dark); border: 1px solid var(--border-color); color: var(--text-primary); padding: 0.5rem; border-radius: 8px;">
                                <option value="all">Tutte</option>
                                <option value="Cults3D">Cults3D</option>
                                <option value="Pixup">Pixup</option>
                                <option value="CGTrader">CGTrader</option>
                                <option value="3DExport">3DExport</option>
                            </select>
                        </div>

                        <!-- Period Filter -->
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.9rem;">
                                <i class="fa-solid fa-calendar"></i> Periodo
                            </label>
                            <select id="history-period-filter" style="width: 100%; background: var(--bg-dark); border: 1px solid var(--border-color); color: var(--text-primary); padding: 0.5rem; border-radius: 8px;">
                                <option value="all">Tutto</option>
                                <option value="today">Oggi</option>
                                <option value="yesterday">Ieri</option>
                                <option value="month">Questo Mese</option>
                                <option value="year">Quest'Anno</option>
                                <option value="custom">Personalizzato</option>
                            </select>
                        </div>

                        <!-- Search Filter -->
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.9rem;">
                                <i class="fa-solid fa-search"></i> Cerca Prodotto
                            </label>
                            <input type="text" id="history-search" placeholder="Nome prodotto..." style="width: 100%; background: var(--bg-dark); border: 1px solid var(--border-color); color: var(--text-primary); padding: 0.5rem; border-radius: 8px;">
                        </div>
                    </div>

                    <!-- Custom Date Range (Hidden by default) -->
                    <div id="history-custom-date" style="display: none; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                        <div style="display: flex; gap: 1rem; align-items: end; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 150px;">
                                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.9rem;">Da:</label>
                                <input type="date" id="history-date-start" style="width: 100%; background: var(--bg-dark); border: 1px solid var(--border-color); color: var(--text-primary); padding: 0.5rem; border-radius: 8px;">
                            </div>
                            <div style="flex: 1; min-width: 150px;">
                                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.9rem;">A:</label>
                                <input type="date" id="history-date-end" style="width: 100%; background: var(--bg-dark); border: 1px solid var(--border-color); color: var(--text-primary); padding: 0.5rem; border-radius: 8px;">
                            </div>
                            <button id="history-apply-date" class="btn-success" style="padding: 0.5rem 1.5rem;">
                                <i class="fa-solid fa-check"></i> Applica
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Sales Table -->
                <div class="glass" style="padding: 1.5rem;">
                    <div class="history-table-container">
                        <table class="history-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Piattaforma</th>
                                    <th>Prodotto</th>
                                    <th style="text-align: right;">Importo</th>
                                </tr>
                            </thead>
                            <tbody id="history-table-body">
                                <!-- Populated by JS -->
                            </tbody>
                        </table>
                    </div>

                    <!-- Pagination -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color); flex-wrap: wrap; gap: 1rem;">
                        <div style="color: var(--text-secondary);">
                            <span id="history-page-info">Pagina 1</span>
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button id="history-prev-btn" class="btn-secondary" style="padding: 0.5rem 1rem;">
                                <i class="fa-solid fa-chevron-left"></i> Precedente
                            </button>
                            <button id="history-next-btn" class="btn-secondary" style="padding: 0.5rem 1rem;">
                                Successiva <i class="fa-solid fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
*/

// ========== CODICE JAVASCRIPT PER script.js ==========
// Aggiungi questo alla fine di script.js (dopo la riga 1062):

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

// ========== MODIFICHE NECESSARIE ==========
//
// 1. Modifica la riga 23 di script.js da:
//    setupMobileHeader(); // Add Settings Button
// a:
//    setupMobileHeader(); // Add Settings Button
//    setupHistoryView(); // Initialize History View Listeners
//
// 2. Modifica la funzione setupNavigation() (riga 562) aggiungendo dopo la riga 576:
//    // Load data if switching to history
//    if (pageId === 'history') {
//        loadHistoryTableData();
//    }
