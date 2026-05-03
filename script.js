// STL Sales Tracker - Core Logic
// Note: CONFIG and supabase client are initialized in supabase-config.js

// Global State
let lastSalesCount = 0;
let isFirstLoad = true;
let currentSalesLimit = 5;
let salesChart = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('STL Sales Tracker Initialized');

    // Wait for Supabase client to be ready
    let retries = 0;
    const maxRetries = 20; // 2 seconds max wait
    while (retries < maxRetries && (!window.supabase || typeof window.supabase.from !== 'function')) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
    }

    if (!window.supabase || typeof window.supabase.from !== 'function') {
        console.error('❌ Supabase client not initialized after waiting');
        return;
    }

    // Initialize UI Components
    setupNavigation();
    setupSound();
    setupChartControls();

    // Setup Features
    await setupModalLogic();
    requestNotificationPermission();
    setupMobileHeader(); // Add Settings Button
    setupHistoryView(); // Initialize History View Listeners
    setupBackupRestore(); // Initialize Backup & Restore
    setupMonthlyView(); // Initialize Monthly Income View

    // Initial Data Load
    await loadDashboardData();

    // Setup Event Listeners
    setupEventListeners();

    // Start Auto Refresh
    startAutoRefresh();
});

function setupEventListeners() {
    // Sales Limit Selector
    const salesLimitSelect = document.getElementById('sales-limit-select');
    if (salesLimitSelect) {
        salesLimitSelect.addEventListener('change', async (e) => {
            currentSalesLimit = parseInt(e.target.value);
            await loadRecentSales(currentSalesLimit);
        });
    }

    // Check Email Button
    const checkEmailBtn = document.getElementById('check-email-btn');
    if (checkEmailBtn) {
        checkEmailBtn.addEventListener('click', handleCheckEmails);
    }

    // Settings Toggles
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
        soundToggle.addEventListener('change', (e) => {
            CONFIG.notificationSound = e.target.checked;
        });
    }

    const notificationToggle = document.getElementById('notification-toggle');
    if (notificationToggle) {
        notificationToggle.addEventListener('change', (e) => {
            CONFIG.enablePushNotifications = e.target.checked;
            if (e.target.checked) requestNotificationPermission();
        });
    }

    // Platforms Comparison Month Selector
    const comparisonMonthSelect = document.getElementById('comparison-month-select');
    if (comparisonMonthSelect) {
        // Set default to last month if empty
        if (!comparisonMonthSelect.value) {
            const prev = new Date();
            prev.setMonth(prev.getMonth() - 1);
            comparisonMonthSelect.value = prev.toISOString().substring(0, 7);
        }
        
        comparisonMonthSelect.addEventListener('change', async () => {
            await loadPlatformsTableData();
        });
    }
}

// --- Core Data Loading ---
async function loadDashboardData() {
    try {
        await Promise.all([
            loadStats(),
            loadChartData('7'),
            loadTopPlatforms(),
            loadRecentSales(currentSalesLimit),
            loadPlatformsTableData()
        ]);
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// --- Statistics (Timezone Fixed) ---
async function loadStats() {
    try {
        // STRICT LOCAL DATE HANDLING
        // We compare dates as strings YYYY-MM-DD in local time to avoid ANY timezone confusion
        const now = new Date();

        // Helper to get local YYYY-MM-DD
        const getLocalISODate = (date) => {
            const offset = date.getTimezoneOffset();
            const localDate = new Date(date.getTime() - (offset * 60 * 1000));
            return localDate.toISOString().split('T')[0];
        };

        const todayStr = getLocalISODate(now);

        const yesterdayDate = new Date(now);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = getLocalISODate(yesterdayDate);

        const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const yearStartStr = `${now.getFullYear()}-01-01`;

        // Fetch ALL sales from start of year (safe for small datasets)
        const { data: allSales } = await supabase
            .from('sales')
            .select('amount, sale_date')
            .gte('sale_date', yearStartStr);

        if (!allSales) return;

        // Filter in JS using Local Strings
        const todaySales = allSales.filter(sale => getLocalISODate(new Date(sale.sale_date)) === todayStr);
        const yesterdaySales = allSales.filter(sale => getLocalISODate(new Date(sale.sale_date)) === yesterdayStr);
        const monthSales = allSales.filter(sale => getLocalISODate(new Date(sale.sale_date)) >= monthStartStr);
        const yearSales = allSales; // Since we fetched >= yearStartStr

        // Calculate Totals
        const todayCount = todaySales.length;
        const todayAmount = todaySales.reduce((sum, sale) => sum + (sale.amount || 0), 0);

        const yesterdayCount = yesterdaySales.length;
        const yesterdayAmount = yesterdaySales.reduce((sum, sale) => sum + (sale.amount || 0), 0);

        const monthAmount = monthSales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
        const yearAmount = yearSales.reduce((sum, sale) => sum + (sale.amount || 0), 0);

        // Calculate Differences
        const countDiff = todayCount - yesterdayCount;
        const amountDiff = todayAmount - yesterdayAmount;

        // Update UI
        updateStatElement('today-count', todayCount);
        updateStatElement('today-amount', `€${todayAmount.toFixed(2)}`);
        updateStatElement('month-amount', `€${monthAmount.toFixed(2)}`);
        updateStatElement('year-amount', `€${yearAmount.toFixed(2)}`);

        // Update Trends
        updateTrend('today-count', countDiff, false);
        updateTrend('today-amount', amountDiff, true);

        // New Sales Notification
        if (!isFirstLoad && todayCount > lastSalesCount) {
            const newSalesCount = todayCount - lastSalesCount;
            if (CONFIG.notificationSound) playCashSound();
            showNotification('🎉 Nuova Vendita!', `Hai ricevuto ${newSalesCount} nuova vendita!`);
        }

        lastSalesCount = todayCount;
        isFirstLoad = false;

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function updateStatElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function updateTrend(elementId, diff, isCurrency) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const trendEl = el.closest('.stat-card')?.querySelector('.stat-trend');
    if (!trendEl) return;

    const isPositive = diff >= 0;
    const valueStr = isCurrency ? `€${Math.abs(diff).toFixed(2)}` : Math.abs(diff);

    trendEl.className = `stat-trend ${isPositive ? 'positive' : 'negative'}`;
    trendEl.innerHTML = `
        <i class="fa-solid fa-arrow-${isPositive ? 'up' : 'down'}"></i>
        <span>${isPositive ? '+' : '-'}${valueStr} vs ieri</span>
    `;
    trendEl.style.color = isPositive ? '#10b981' : '#ef4444';
}

// --- Recent Sales (Mobile Fixed) ---
async function loadRecentSales(limit = currentSalesLimit) {
    const { data, error } = await supabase
        .from('sales')
        .select('*, platforms(name)')
        .order('sale_date', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching sales:', error);
        return;
    }

    const tbody = document.getElementById('recent-sales-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem;">Nessuna vendita recente</td></tr>';
        return;
    }

    data.forEach(sale => {
        const saleDate = new Date(sale.sale_date);

        // Separa data e ora per layout più compatto
        const dateOnly = saleDate.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });

        const timeOnly = saleDate.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const row = `
        <tr>
            <td data-label="Piattaforma">
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span style="font-weight:600;">${sale.platforms?.name || 'Unknown'}</span>
                </div>
            </td>
            <td data-label="Prodotto">${sale.product_name || '-'}</td>
            <td data-label="Data" style="white-space: nowrap;">
                <div style="display: flex; flex-direction: column; gap: 0.15rem; line-height: 1.2;">
                    <span style="font-size: 0.9rem;">${dateOnly}</span>
                    <span style="font-size: 0.85rem; color: var(--text-secondary);">${timeOnly}</span>
                </div>
            </td>
            <td data-label="Importo" style="font-weight:bold; color:#10b981; text-align: right; padding-right: 1rem;">€${sale.amount.toFixed(2)}</td>
        </tr>
        `;
        tbody.innerHTML += row;
    });
}

// --- Top Platforms ---
async function loadTopPlatforms() {
    try {
        // Use same timezone logic as loadStats
        const now = new Date();
        const getLocalISODate = (date) => {
            const offset = date.getTimezoneOffset();
            const localDate = new Date(date.getTime() - (offset * 60 * 1000));
            return localDate.toISOString().split('T')[0];
        };
        const todayStr = getLocalISODate(now);

        // Fetch all sales from today (local midnight) backwards
        // We fetch a bit more to be safe with timezone
        const yesterdayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

        const { data: allSales } = await supabase
            .from('sales')
            .select('amount, sale_date, platforms(name)')
            .gte('sale_date', yesterdayMidnight.toISOString());

        const container = document.getElementById('platform-list');
        if (!container) return;
        container.innerHTML = '';

        if (!allSales || allSales.length === 0) {
            container.innerHTML = '<div style="padding:1rem; text-align:center; color:#94a3b8;">Nessuna vendita oggi</div>';
            return;
        }

        // Filter for today (local) and aggregate
        const stats = {};
        allSales.forEach(sale => {
            const saleLocalDate = getLocalISODate(new Date(sale.sale_date));
            if (saleLocalDate === todayStr) {
                const name = sale.platforms?.name || 'Unknown';
                if (!stats[name]) stats[name] = { count: 0, amount: 0 };
                stats[name].count++;
                stats[name].amount += sale.amount;
            }
        });

        // Check if we have any sales today
        if (Object.keys(stats).length === 0) {
            container.innerHTML = '<div style="padding:1rem; text-align:center; color:#94a3b8;">Nessuna vendita oggi</div>';
            return;
        }

        // Sort by amount
        const sorted = Object.entries(stats).sort((a, b) => b[1].amount - a[1].amount);

        sorted.forEach(([name, data]) => {
            const el = `
            <div class="platform-item">
                <div class="platform-info">
                    <div class="platform-logo">${name.substring(0, 2).toUpperCase()}</div>
                    <div>
                        <div style="font-weight:600;">${name}</div>
                        <div style="font-size:0.8rem; color:#94a3b8;">${data.count} vendite</div>
                    </div>
                </div>
                <div style="font-weight:bold;">€${data.amount.toFixed(2)}</div>
            </div>
            `;
            container.innerHTML += el;
        });

    } catch (error) {
        console.error('Error loading platforms:', error);
    }
}

// --- Chart Logic ---
async function loadChartData(period = '7', startDate = null, endDate = null) {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Calculate Date Range (using local timezone)
    let queryStart, queryEnd;
    const now = new Date();

    const getLocalDateString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    if (period === 'custom' && startDate && endDate) {
        queryStart = startDate;
        queryEnd = endDate;
    } else if (period === 'today') {
        queryStart = getLocalDateString(now);
        queryEnd = queryStart;
    } else if (period === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        queryStart = getLocalDateString(yesterday);
        queryEnd = queryStart;
    } else {
        const days = parseInt(period);
        const d = new Date(now);
        d.setDate(d.getDate() - days + 1);
        queryStart = getLocalDateString(d);
        queryEnd = getLocalDateString(now);
    }

    // Fetch Data
    const { data, error } = await supabase
        .from('sales') // Querying sales directly is safer if daily_totals view is missing/broken
        .select('sale_date, amount, platforms(name)')
        .gte('sale_date', queryStart)
        .lte('sale_date', queryEnd + 'T23:59:59');

    let labels = [];
    let values = [];

    if (data && data.length > 0) {
        const aggregated = {};

        // Initialize all days in range with 0 (using local date arithmetic)
        const [startY, startM, startD] = queryStart.split('-').map(Number);
        const [endY, endM, endD] = queryEnd.split('-').map(Number);
        
        let currentDate = new Date(startY, startM - 1, startD);
        const stopDate = new Date(endY, endM - 1, endD);

        while (currentDate <= stopDate) {
            const dayKey = getLocalDateString(currentDate);
            aggregated[dayKey] = 0;
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Fill with data (ensuring local day calculation)
        data.forEach(s => {
            const saleDate = new Date(s.sale_date);
            let day = getLocalDateString(saleDate);

            // --- FIX: Move CGTrader ~6€ sale from Dec 1 to Dec 2 ---
            if (Math.abs(s.amount - 6) < 0.1 && (s.platforms?.name || '').includes('CGTrader') && day === '2024-12-01') {
                day = '2024-12-02';
            }
            // ------------------------------------------------------

            if (aggregated[day] !== undefined) {
                aggregated[day] += s.amount;
            }
        });

        const sortedDates = Object.keys(aggregated).sort();
        labels = sortedDates.map(date => new Date(date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }));
        values = sortedDates.map(date => aggregated[date]);
    } else {
        labels = ['Nessun dato'];
        values = [0];
    }

    if (salesChart) salesChart.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Incasso (€)',
                data: values,
                borderColor: '#10b981',
                backgroundColor: gradient,
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#10b981',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

function setupChartControls() {
    const periodSelect = document.getElementById('chart-period');
    const customDateBtn = document.getElementById('custom-date-btn');
    const datePicker = document.getElementById('date-range-picker');
    const applyBtn = document.getElementById('apply-custom-date');

    if (periodSelect) {
        periodSelect.addEventListener('change', (e) => {
            if (e.target.value !== 'custom') {
                if (datePicker) datePicker.style.display = 'none';
                loadChartData(e.target.value);
            }
        });
    }

    if (customDateBtn && datePicker) {
        customDateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            datePicker.style.display = datePicker.style.display === 'flex' ? 'none' : 'flex';
        });

        document.addEventListener('click', (e) => {
            if (!datePicker.contains(e.target) && !customDateBtn.contains(e.target)) {
                datePicker.style.display = 'none';
            }
        });
    }

    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            const start = document.getElementById('date-start').value;
            const end = document.getElementById('date-end').value;
            if (start && end) {
                datePicker.style.display = 'none';
                loadChartData('custom', start, end);
            }
        });
    }
}

// --- Modal & Form Logic ---
async function setupModalLogic() {
    const modal = document.getElementById('sale-modal');
    const addBtn = document.getElementById('add-sale-btn');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-btn');
    const form = document.getElementById('sale-form');
    const platformSelect = document.getElementById('platform-select');

    // Load Platforms
    const { data: platforms } = await supabase.from('platforms').select('*').order('name');
    if (platforms && platformSelect) {
        platformSelect.innerHTML = ''; // Clear existing
        platforms.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            platformSelect.appendChild(opt);
        });
    }

    // Modal Actions
    const openModal = () => modal.classList.add('active');
    const closeModal = () => {
        modal.classList.remove('active');
        form.reset();
    };

    if (addBtn) addBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Form Submit
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = {
                platform_id: platformSelect.value,
                product_name: document.getElementById('product-name').value,
                amount: parseFloat(document.getElementById('amount').value),
                currency: document.getElementById('currency').value,
                sale_date: new Date().toISOString()
            };

            const { error } = await supabase.from('sales').insert([formData]);
            if (!error) {
                showNotification('✅ Vendita aggiunta!', 'Successo');
                closeModal();
                loadDashboardData();
                if (CONFIG.notificationSound) playCashSound();
            } else {
                showNotification('❌ Errore', 'Impossibile aggiungere vendita');
            }
        });
    }
}

// --- Email Check Logic ---
async function handleCheckEmails() {
    const btn = document.getElementById('check-email-btn');
    const icon = btn.querySelector('i');
    const span = btn.querySelector('span');
    const originalText = span ? span.textContent : '';

    btn.disabled = true;
    icon.classList.remove('fa-envelope');
    icon.classList.add('fa-spinner', 'fa-spin');
    if (span) span.textContent = 'Controllo...';

    try {
        const response = await fetch('https://zhgpccmzgyertwnvyiaz.supabase.co/functions/v1/gmail-checker', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.supabaseKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            await loadDashboardData();
            showNotification('✅ Email controllate!', `${result.newSales || 0} nuove vendite.`);
            if (result.newSales > 0 && CONFIG.notificationSound) playCashSound();
        } else {
            throw new Error('API Error');
        }
    } catch (error) {
        console.error(error);
        showNotification('❌ Errore', 'Controllo fallito');
    } finally {
        btn.disabled = false;
        icon.classList.remove('fa-spinner', 'fa-spin');
        icon.classList.add('fa-envelope');
        if (span) span.textContent = originalText;
    }
}

// --- Navigation Logic ---
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    const views = document.querySelectorAll('.view');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = item.dataset.page;

            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            views.forEach(v => v.classList.remove('active'));
            const target = document.getElementById(`${pageId}-view`);
            if (target) target.classList.add('active');

            // Load data if switching to history
            if (pageId === 'history') {
                loadHistoryTableData();
            }
            // Load monthly income data when switching to that view
            if (pageId === 'monthly') {
                loadMonthlyIncomeData();
            }
        });
    });
}

// --- Utilities ---
function setupSound() {
    const audio = document.getElementById('cash-sound');
    if (audio) audio.load();
}

function playCashSound() {
    const audio = document.getElementById('cash-sound');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Audio play blocked', e));
    }
}

// --- Platforms Table Logic ---
async function loadPlatformsTableData() {
    try {
        const { data: allSales, error } = await supabase
            .from('sales')
            .select('amount, sale_date, platforms(name)');

        if (error) throw error;

        // Initialize Stats Structure
        const stats = {
            'Cults3D': { today: { c: 0, a: 0 }, month: { c: 0, a: 0 }, year: { c: 0, a: 0 }, comparison: { c: 0, a: 0 }, total: { c: 0, a: 0 } },
            'Pixup': { today: { c: 0, a: 0 }, month: { c: 0, a: 0 }, year: { c: 0, a: 0 }, comparison: { c: 0, a: 0 }, total: { c: 0, a: 0 } },
            'CGTrader': { today: { c: 0, a: 0 }, month: { c: 0, a: 0 }, year: { c: 0, a: 0 }, comparison: { c: 0, a: 0 }, total: { c: 0, a: 0 } },
            '3DExport': { today: { c: 0, a: 0 }, month: { c: 0, a: 0 }, year: { c: 0, a: 0 }, comparison: { c: 0, a: 0 }, total: { c: 0, a: 0 } }
        };

        // Time Helpers
        const now = new Date();
        const getLocalISODate = (date) => {
            const offset = date.getTimezoneOffset();
            const localDate = new Date(date.getTime() - (offset * 60 * 1000));
            return localDate.toISOString().split('T')[0];
        };
        const todayStr = getLocalISODate(now);
        const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const yearStartStr = `${now.getFullYear()}-01-01`;

        // Comparison Month Range
        const compMonthSelect = document.getElementById('comparison-month-select');
        const compDateStr = compMonthSelect ? compMonthSelect.value : ''; // "YYYY-MM"
        const compMonthStartStr = compDateStr ? `${compDateStr}-01` : '9999-99-99';
        
        // Calculate end of comparison month
        let compMonthEndStr = '9999-99-99';
        if (compDateStr) {
            const [y, m] = compDateStr.split('-').map(Number);
            const lastDay = new Date(y, m, 0).getDate();
            compMonthEndStr = `${compDateStr}-${String(lastDay).padStart(2, '0')}`;
        }

        // Aggregate
        allSales.forEach(sale => {
            const platformName = sale.platforms?.name;
            if (!stats[platformName]) return; // Skip unknown platforms

            const amount = sale.amount || 0;
            let saleDateStr = getLocalISODate(new Date(sale.sale_date));

            // --- FIX: Move CGTrader ~6€ sale from Dec 1 to Dec 2 ---
            if (Math.abs(amount - 6) < 0.1 && platformName.includes('CGTrader') && saleDateStr === '2024-12-01') {
                saleDateStr = '2024-12-02';
            }
            // ------------------------------------------------------

            // Total
            stats[platformName].total.c++;
            stats[platformName].total.a += amount;

            // Year
            if (saleDateStr >= yearStartStr) {
                stats[platformName].year.c++;
                stats[platformName].year.a += amount;
            }

            // Month
            if (saleDateStr >= monthStartStr) {
                stats[platformName].month.c++;
                stats[platformName].month.a += amount;
            }

            // Today
            if (saleDateStr === todayStr) {
                stats[platformName].today.c++;
                stats[platformName].today.a += amount;
            }

            // Comparison Month
            if (saleDateStr >= compMonthStartStr && saleDateStr <= compMonthEndStr) {
                stats[platformName].comparison.c++;
                stats[platformName].comparison.a += amount;
            }
        });

        // Update DOM
        Object.keys(stats).forEach(platform => {
            const row = document.querySelector(`.platform-row[data-platform="${platform}"]`);
            if (!row) return;

            // Helper to update cell
            const updateCell = (period, data) => {
                const cell = row.querySelector(`.platform-stat[data-period="${period}"]`);
                if (cell) {
                    cell.querySelector('div:first-child').textContent = `€${data.a.toFixed(2)}`;
                    const salesCountEl = cell.querySelector('div:last-child');
                    if (salesCountEl) salesCountEl.textContent = `${data.c} vendite`;

                    // Handle Comparison Diff
                    if (period === 'comparison') {
                        const currentMonthAmt = stats[platform].month.a;
                        const diff = currentMonthAmt - data.a;
                        const diffEl = cell.querySelector('.comparison-diff');
                        
                        if (diffEl) {
                            const isPositive = diff >= 0;
                            diffEl.style.color = isPositive ? '#10b981' : '#ef4444';
                                diffEl.innerHTML = `
                                    <i class="fa-solid fa-${isPositive ? 'arrow-up' : 'arrow-down'}"></i>
                                    ${isPositive ? '+' : '-'}€${Math.abs(diff).toFixed(2)} vs ora
                                `;
                        }
                    }
                }
            };

            updateCell('today', stats[platform].today);
            updateCell('month', stats[platform].month);
            updateCell('year', stats[platform].year);
            updateCell('comparison', stats[platform].comparison);
            updateCell('total', stats[platform].total);
        });

    } catch (error) {
        console.error('Error loading platforms table:', error);
    }
}

// --- Notification System ---
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function showNotification(title, body) {
    // 1. Browser Notification (if enabled)
    if (CONFIG.enablePushNotifications && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
    }

    // 2. Visual Toast Notification (Always show)
    showToast(title, body);

    console.log(`${title}: ${body}`);
}

function showToast(title, message) {
    // Create toast container if not exists
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        background: #1e293b;
        border: 1px solid #334155;
        color: #f8fafc;
        padding: 12px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 300px;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        pointer-events: auto;
    `;

    // Determine icon based on title
    let icon = '🔔';
    if (title.includes('✅')) icon = '✅';
    if (title.includes('❌')) icon = '❌';
    if (title.includes('🎉')) icon = '🎉';

    toast.innerHTML = `
        <div style="font-size: 1.5rem;">${icon}</div>
        <div style="display: flex; flex-direction: column;">
            <div style="font-weight: 600; font-size: 0.95rem;">${title.replace(/^[✅❌🎉]\s*/, '')}</div>
            <div style="font-size: 0.85rem; color: #94a3b8;">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, 4000);
}

function startAutoRefresh() {
    setInterval(loadDashboardData, CONFIG.emailCheckInterval);
}

function setupMobileHeader() {
    const actionsContainer = document.querySelector('.actions');
    if (!actionsContainer) return;

    // Check if buttons already exist
    if (document.getElementById('mobile-settings-btn')) return;

    // ========== CREATE HISTORY BUTTON (TOGGLE SWITCH) ==========
    const historyBtn = document.createElement('button');
    historyBtn.id = 'mobile-history-btn';
    historyBtn.className = 'btn-history-toggle';
    historyBtn.title = 'Storico';

    // Initial style (OFF state - gray)
    historyBtn.style.cssText = `
        width: 42px;
        height: 42px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        background: rgba(148, 163, 184, 0.1);
        border: 2px solid rgba(148, 163, 184, 0.3);
        color: #94a3b8;
    `;

    historyBtn.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i>';

    // Function to update history button state
    const updateHistoryButtonState = (isActive) => {
        if (isActive) {
            // ON state - green/active
            historyBtn.style.background = 'rgba(16, 185, 129, 0.2)';
            historyBtn.style.borderColor = 'rgba(16, 185, 129, 0.5)';
            historyBtn.style.color = '#10b981';
            historyBtn.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.3)';
        } else {
            // OFF state - gray/inactive
            historyBtn.style.background = 'rgba(148, 163, 184, 0.1)';
            historyBtn.style.borderColor = 'rgba(148, 163, 184, 0.3)';
            historyBtn.style.color = '#94a3b8';
            historyBtn.style.boxShadow = 'none';
        }
    };

    // Add click action (Toggle: History <-> Dashboard)
    historyBtn.addEventListener('click', () => {
        const historySection = document.getElementById('history-view');

        if (historySection) {
            // Check if we are currently on the history page
            const isHistoryActive = historySection.classList.contains('active');

            if (isHistoryActive) {
                // If on history, go back to Dashboard
                const dashboardNav = document.querySelector('.nav-item[data-page="dashboard"]');
                if (dashboardNav) dashboardNav.click();
                updateHistoryButtonState(false); // Turn OFF
            } else {
                // If not on history, go to History
                const historyNav = document.querySelector('.nav-item[data-page="history"]');
                if (historyNav) historyNav.click();
                updateHistoryButtonState(true); // Turn ON
            }
        } else {
            showToast('🕒 Storico', 'Funzionalità in arrivo...');
        }
    });

    // ========== CREATE PLATFORMS BUTTON (TOGGLE SWITCH) ==========
    const platformsBtn = document.createElement('button');
    platformsBtn.id = 'mobile-platforms-btn';
    platformsBtn.className = 'btn-platforms-toggle';
    platformsBtn.title = 'Piattaforme';

    // Initial style (OFF state - gray)
    platformsBtn.style.cssText = `
        width: 42px;
        height: 42px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        background: rgba(148, 163, 184, 0.1);
        border: 2px solid rgba(148, 163, 184, 0.3);
        color: #94a3b8;
    `;

    platformsBtn.innerHTML = '<i class="fa-solid fa-layer-group"></i>';

    // Function to update platforms button state
    const updatePlatformsButtonState = (isActive) => {
        if (isActive) {
            // ON state - green/active
            platformsBtn.style.background = 'rgba(16, 185, 129, 0.2)';
            platformsBtn.style.borderColor = 'rgba(16, 185, 129, 0.5)';
            platformsBtn.style.color = '#10b981';
            platformsBtn.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.3)';
        } else {
            // OFF state - gray/inactive
            platformsBtn.style.background = 'rgba(148, 163, 184, 0.1)';
            platformsBtn.style.borderColor = 'rgba(148, 163, 184, 0.3)';
            platformsBtn.style.color = '#94a3b8';
            platformsBtn.style.boxShadow = 'none';
        }
    };

    // Add click action (Toggle: Platforms <-> Dashboard)
    platformsBtn.addEventListener('click', () => {
        const platformsSection = document.getElementById('platforms-view');

        if (platformsSection) {
            // Check if we are currently on the platforms page
            const isPlatformsActive = platformsSection.classList.contains('active');

            if (isPlatformsActive) {
                // If on platforms, go back to Dashboard
                const dashboardNav = document.querySelector('.nav-item[data-page="dashboard"]');
                if (dashboardNav) dashboardNav.click();
                updatePlatformsButtonState(false); // Turn OFF
            } else {
                // If not on platforms, go to Platforms
                const platformsNav = document.querySelector('.nav-item[data-page="platforms"]');
                if (platformsNav) platformsNav.click();
                updatePlatformsButtonState(true); // Turn ON
            }
        } else {
            showToast('📦 Piattaforme', 'Funzionalità in arrivo...');
        }
    });

    // ========== CREATE ANALYTICS BUTTON (TOGGLE SWITCH) ==========
    const analyticsBtn = document.createElement('button');
    analyticsBtn.id = 'mobile-analytics-btn';
    analyticsBtn.className = 'btn-analytics-toggle';
    analyticsBtn.title = 'Analytics';

    // Initial style (OFF state - gray)
    analyticsBtn.style.cssText = `
        width: 42px;
        height: 42px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        background: rgba(148, 163, 184, 0.1);
        border: 2px solid rgba(148, 163, 184, 0.3);
        color: #94a3b8;
    `;

    analyticsBtn.innerHTML = '<i class="fa-solid fa-chart-pie"></i>';

    // Track if we're on analytics page (for external navigation)
    let isOnAnalyticsPage = window.location.pathname.includes('analytics.html');

    // Function to update analytics button state
    const updateAnalyticsButtonState = (isActive) => {
        if (isActive) {
            // ON state - green/active
            analyticsBtn.style.background = 'rgba(16, 185, 129, 0.2)';
            analyticsBtn.style.borderColor = 'rgba(16, 185, 129, 0.5)';
            analyticsBtn.style.color = '#10b981';
            analyticsBtn.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.3)';
        } else {
            // OFF state - gray/inactive
            analyticsBtn.style.background = 'rgba(148, 163, 184, 0.1)';
            analyticsBtn.style.borderColor = 'rgba(148, 163, 184, 0.3)';
            analyticsBtn.style.color = '#94a3b8';
            analyticsBtn.style.boxShadow = 'none';
        }
    };

    // Set initial state if on analytics page
    if (isOnAnalyticsPage) {
        updateAnalyticsButtonState(true);
    }

    // Analytics button click - Toggle between Dashboard and Analytics
    analyticsBtn.addEventListener('click', () => {
        const currentPath = window.location.pathname;

        if (currentPath.includes('analytics.html')) {
            // If on analytics, go back to Dashboard (index.html)
            window.location.href = 'index.html';
        } else {
            // If on dashboard, go to Analytics
            window.location.href = 'analytics.html';
        }
    });

    // ========== CREATE SETTINGS BUTTON (TOGGLE SWITCH) ==========
    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'mobile-settings-btn';
    settingsBtn.className = 'btn-settings-toggle'; // Custom class for toggle
    settingsBtn.title = 'Impostazioni';

    // Initial style (OFF state - gray)
    settingsBtn.style.cssText = `
        width: 42px;
        height: 42px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        background: rgba(148, 163, 184, 0.1);
        border: 2px solid rgba(148, 163, 184, 0.3);
        color: #94a3b8;
    `;

    settingsBtn.innerHTML = '<i class="fa-solid fa-gear"></i>';

    // Function to update settings button state
    const updateSettingsButtonState = (isActive) => {
        if (isActive) {
            // ON state - green/active
            settingsBtn.style.background = 'rgba(16, 185, 129, 0.2)';
            settingsBtn.style.borderColor = 'rgba(16, 185, 129, 0.5)';
            settingsBtn.style.color = '#10b981';
            settingsBtn.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.3)';
        } else {
            // OFF state - gray/inactive
            settingsBtn.style.background = 'rgba(148, 163, 184, 0.1)';
            settingsBtn.style.borderColor = 'rgba(148, 163, 184, 0.3)';
            settingsBtn.style.color = '#94a3b8';
            settingsBtn.style.boxShadow = 'none';
        }
    };

    // Add click action (Toggle: Settings <-> Dashboard)
    settingsBtn.addEventListener('click', () => {
        const settingsSection = document.getElementById('settings-view');

        if (settingsSection) {
            // Check if we are currently on the settings page
            const isSettingsActive = settingsSection.classList.contains('active');

            if (isSettingsActive) {
                // If on settings, go back to Dashboard
                const dashboardNav = document.querySelector('.nav-item[data-page="dashboard"]');
                if (dashboardNav) dashboardNav.click();
                updateSettingsButtonState(false); // Turn OFF
            } else {
                // If not on settings, go to Settings
                const settingsNav = document.querySelector('.nav-item[data-page="settings"]');
                if (settingsNav) settingsNav.click();
                updateSettingsButtonState(true); // Turn ON
            }
        } else {
            showToast('⚙️ Impostazioni', 'Funzionalità in arrivo...');
        }
    });

    // Monitor navigation changes to update button states
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const pageId = item.dataset.page;
            updateHistoryButtonState(pageId === 'history');
            updatePlatformsButtonState(pageId === 'platforms');
            updateSettingsButtonState(pageId === 'settings');
        });
    });

    // ========== APPEND BUTTONS TO ACTIONS ==========
    // Add in order: History, Platforms, Analytics, Settings
    actionsContainer.appendChild(historyBtn);
    actionsContainer.appendChild(platformsBtn);
    actionsContainer.appendChild(analyticsBtn);
    actionsContainer.appendChild(settingsBtn);
}

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

// =============================================================
// --- Monthly Income View ---
// =============================================================

let monthlyChart = null;
let monthlyAllSales = null; // cached data

const MONTH_NAMES = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const MONTH_NAMES_FULL = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

const PLATFORM_COLORS = {
    'Cults3D':  { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)' },
    'Pixup':    { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)' },
    'CGTrader': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)' },
    '3DExport': { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)' },
};

function setupMonthlyView() {
    // Populate year selector
    const yearSelect = document.getElementById('monthly-year-select');
    if (!yearSelect) return;

    const currentYear = new Date().getFullYear();
    // Show last 4 years
    for (let y = currentYear; y >= currentYear - 3; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }

    yearSelect.addEventListener('change', () => loadMonthlyIncomeData());
}

async function loadMonthlyIncomeData() {
    const yearSelect = document.getElementById('monthly-year-select');
    const selectedYear = yearSelect ? parseInt(yearSelect.value) : new Date().getFullYear();
    const prevYear = selectedYear - 1;

    // Update legends
    const legendCurrent = document.getElementById('monthly-legend-current');
    const legendPrev = document.getElementById('monthly-legend-prev');
    if (legendCurrent) legendCurrent.textContent = selectedYear;
    if (legendPrev) legendPrev.textContent = prevYear;

    // Fetch all sales for both years
    const fetchStart = `${prevYear}-01-01`;
    const fetchEnd   = `${selectedYear}-12-31T23:59:59`;

    const { data, error } = await supabase
        .from('sales')
        .select('amount, sale_date, platforms(name)')
        .gte('sale_date', fetchStart)
        .lte('sale_date', fetchEnd);

    if (error) {
        console.error('Monthly income error:', error);
        return;
    }

    monthlyAllSales = data || [];

    // Aggregate by year+month and by platform per month
    const aggregateCurrent = new Array(12).fill(0);  // index 0 = Jan
    const aggregatePrev    = new Array(12).fill(0);
    // platformByMonth[year][monthIdx][platformName] = amount
    const platformByMonth = {};
    platformByMonth[selectedYear] = {};
    platformByMonth[prevYear]     = {};
    for (let m = 0; m < 12; m++) {
        platformByMonth[selectedYear][m] = {};
        platformByMonth[prevYear][m]     = {};
    }

    const getLocalISODate = (date) => {
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().split('T')[0];
    };

    monthlyAllSales.forEach(sale => {
        const d = new Date(sale.sale_date);
        let dateStr = getLocalISODate(d);
        // CGTrader fix
        if (Math.abs(sale.amount - 6) < 0.1 && (sale.platforms?.name || '').includes('CGTrader') && dateStr === '2024-12-01') {
            dateStr = '2024-12-02';
        }
        const [yStr, mStr] = dateStr.split('-');
        const y = parseInt(yStr);
        const mIdx = parseInt(mStr) - 1; // 0-based
        const platform = sale.platforms?.name || 'Altro';
        const amount = sale.amount || 0;

        if (y === selectedYear) {
            aggregateCurrent[mIdx] += amount;
            platformByMonth[selectedYear][mIdx][platform] = (platformByMonth[selectedYear][mIdx][platform] || 0) + amount;
        } else if (y === prevYear) {
            aggregatePrev[mIdx] += amount;
            platformByMonth[prevYear][mIdx][platform] = (platformByMonth[prevYear][mIdx][platform] || 0) + amount;
        }
    });

    // Totals
    const totalCurrent = aggregateCurrent.reduce((a, b) => a + b, 0);
    const totalPrev    = aggregatePrev.reduce((a, b) => a + b, 0);
    const variation    = totalCurrent - totalPrev;
    const variationPct = totalPrev > 0 ? ((variation / totalPrev) * 100).toFixed(1) : null;

    const elCurrent   = document.getElementById('monthly-total-current');
    const elPrev      = document.getElementById('monthly-total-prev');
    const elVariation = document.getElementById('monthly-variation');

    if (elCurrent)  elCurrent.textContent  = `€${totalCurrent.toFixed(2)}`;
    if (elPrev)     elPrev.textContent     = `€${totalPrev.toFixed(2)}`;
    if (elVariation) {
        const isPos = variation >= 0;
        const sign  = isPos ? '+' : '';
        const pct   = variationPct !== null ? ` (${isPos ? '+' : ''}${variationPct}%)` : '';
        elVariation.innerHTML = `<span style="color:${isPos ? '#10b981' : '#ef4444'}">${sign}€${Math.abs(variation).toFixed(2)}${pct}</span>`;
    }

    // Build Chart
    const canvas = document.getElementById('monthlyIncomeChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (monthlyChart) monthlyChart.destroy();

    const gradientCurrent = ctx.createLinearGradient(0, 0, 0, 300);
    gradientCurrent.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
    gradientCurrent.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    const gradientPrev = ctx.createLinearGradient(0, 0, 0, 300);
    gradientPrev.addColorStop(0, 'rgba(129, 140, 248, 0.2)');
    gradientPrev.addColorStop(1, 'rgba(129, 140, 248, 0.0)');

    monthlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: MONTH_NAMES,
            datasets: [
                {
                    label: `Incasso ${selectedYear} (€)`,
                    data: aggregateCurrent,
                    borderColor: '#10b981',
                    backgroundColor: gradientCurrent,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#10b981',
                    pointRadius: 5,
                    pointHoverRadius: 8,
                },
                {
                    label: `Incasso ${prevYear} (€)`,
                    data: aggregatePrev,
                    borderColor: '#818cf8',
                    backgroundColor: gradientPrev,
                    borderWidth: 2.5,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#818cf8',
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    borderDash: [6, 3],
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10,10,20,0.9)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: €${ctx.parsed.y.toFixed(2)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#94a3b8',
                        callback: (v) => `€${v.toFixed(0)}`
                    }
                },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            },
            onClick: (evt, elements) => {
                if (elements && elements.length > 0) {
                    const mIdx = elements[0].index;
                    showMonthBreakdown(mIdx, selectedYear, platformByMonth);
                }
            }
        }
    });

    // Build the full summary table for all months
    buildMonthlySummaryTable(selectedYear, prevYear, aggregateCurrent, aggregatePrev, platformByMonth);
}

function showMonthBreakdown(mIdx, selectedYear, platformByMonth) {
    const card    = document.getElementById('monthly-breakdown-card');
    const titleEl = document.getElementById('monthly-breakdown-title');
    const listEl  = document.getElementById('monthly-breakdown-list');
    const totalEl = document.getElementById('monthly-breakdown-total');

    if (!card || !titleEl || !listEl || !totalEl) return;

    const platforms = platformByMonth[selectedYear][mIdx];
    const total = Object.values(platforms).reduce((a, b) => a + b, 0);

    titleEl.textContent = `${MONTH_NAMES_FULL[mIdx]} ${selectedYear} — Dettaglio Piattaforme`;
    totalEl.textContent = `€${total.toFixed(2)}`;

    const sorted = Object.entries(platforms).sort((a, b) => b[1] - a[1]);

    listEl.innerHTML = '';
    if (sorted.length === 0) {
        listEl.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding:1rem;">Nessun incasso per questo mese</div>';
    } else {
        sorted.forEach(([name, amount]) => {
            const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
            const pc = PLATFORM_COLORS[name] || { color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)' };
            listEl.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:0.8rem 1rem; background:${pc.bg}; border:1px solid ${pc.border}; border-radius:10px;">
                    <div style="display:flex; align-items:center; gap:0.7rem;">
                        <div style="width:10px; height:10px; border-radius:50%; background:${pc.color};"></div>
                        <span style="font-weight:600;">${name}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:1rem;">
                        <span style="font-size:0.8rem; color:var(--text-secondary);">${pct}%</span>
                        <span style="font-weight:700; color:${pc.color};">€${amount.toFixed(2)}</span>
                    </div>
                </div>
            `;
        });
    }

    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function buildMonthlySummaryTable(selectedYear, prevYear, aggregateCurrent, aggregatePrev, platformByMonth) {
    const container = document.getElementById('monthly-summary-table');
    if (!container) return;

    // Collect all platform names that appear in the current year
    const allPlatforms = new Set();
    for (let m = 0; m < 12; m++) {
        Object.keys(platformByMonth[selectedYear][m]).forEach(p => allPlatforms.add(p));
    }
    const platforms = Array.from(allPlatforms).sort();

    let html = `<div style="overflow-x:auto;">`;
    html += `<table style="width:100%; border-collapse:collapse; font-size:0.88rem; min-width:600px;">`;
    html += `<thead><tr style="border-bottom:2px solid var(--border-color);">`;
    html += `<th style="text-align:left; padding:0.7rem 0.8rem; color:var(--text-secondary); font-weight:600;">Mese</th>`;
    platforms.forEach(p => {
        const pc = PLATFORM_COLORS[p] || { color: '#64748b' };
        html += `<th style="text-align:right; padding:0.7rem 0.8rem; color:${pc.color}; font-weight:600;">${p}</th>`;
    });
    html += `<th style="text-align:right; padding:0.7rem 0.8rem; color:#10b981; font-weight:700;">Totale ${selectedYear}</th>`;
    html += `<th style="text-align:right; padding:0.7rem 0.8rem; color:#818cf8; font-weight:600;">Totale ${prevYear}</th>`;
    html += `<th style="text-align:right; padding:0.7rem 0.8rem; color:var(--text-secondary); font-weight:600;">Var.</th>`;
    html += `</tr></thead><tbody>`;

    for (let m = 0; m < 12; m++) {
        const monthData  = platformByMonth[selectedYear][m];
        const monthTotal = aggregateCurrent[m];
        const prevTotal  = aggregatePrev[m];
        const diff = monthTotal - prevTotal;
        const isPos = diff >= 0;
        const diffStr = (monthTotal === 0 && prevTotal === 0) ? '—' : `<span style="color:${isPos ? '#10b981' : '#ef4444'}">${isPos ? '+' : ''}€${Math.abs(diff).toFixed(2)}</span>`;

        const rowBg = m % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent';
        html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.04); background:${rowBg}; cursor:pointer; transition:background 0.2s;"
            onmouseover="this.style.background='rgba(16,185,129,0.05)'"
            onmouseout="this.style.background='${rowBg}'">`;
        html += `<td style="padding:0.65rem 0.8rem; font-weight:600;">${MONTH_NAMES_FULL[m]}</td>`;
        platforms.forEach(p => {
            const amt = monthData[p] || 0;
            const pc = PLATFORM_COLORS[p] || { color: '#64748b' };
            html += `<td style="text-align:right; padding:0.65rem 0.8rem; color:${amt > 0 ? pc.color : 'var(--text-secondary)'}; font-weight:${amt > 0 ? '600' : '400'};">${amt > 0 ? '€' + amt.toFixed(2) : '—'}</td>`;
        });
        html += `<td style="text-align:right; padding:0.65rem 0.8rem; color:#10b981; font-weight:700;">${monthTotal > 0 ? '€' + monthTotal.toFixed(2) : '—'}</td>`;
        html += `<td style="text-align:right; padding:0.65rem 0.8rem; color:#818cf8;">${prevTotal > 0 ? '€' + prevTotal.toFixed(2) : '—'}</td>`;
        html += `<td style="text-align:right; padding:0.65rem 0.8rem;">${diffStr}</td>`;
        html += `</tr>`;
    }

    // Grand totals row
    const grandTotal = aggregateCurrent.reduce((a, b) => a + b, 0);
    const grandPrev  = aggregatePrev.reduce((a, b) => a + b, 0);
    const grandDiff  = grandTotal - grandPrev;
    const gIsPos = grandDiff >= 0;
    html += `<tr style="border-top:2px solid var(--border-color); background:rgba(255,255,255,0.03);">`;
    html += `<td style="padding:0.8rem; font-weight:700; color:var(--text-primary);">TOTALE</td>`;
    platforms.forEach(p => {
        const total = aggregateCurrent.reduce((sum, _, mIdx) => sum + (platformByMonth[selectedYear][mIdx][p] || 0), 0);
        const pc = PLATFORM_COLORS[p] || { color: '#64748b' };
        html += `<td style="text-align:right; padding:0.8rem; color:${pc.color}; font-weight:700;">${total > 0 ? '€' + total.toFixed(2) : '—'}</td>`;
    });
    html += `<td style="text-align:right; padding:0.8rem; color:#10b981; font-weight:700;">€${grandTotal.toFixed(2)}</td>`;
    html += `<td style="text-align:right; padding:0.8rem; color:#818cf8; font-weight:700;">€${grandPrev.toFixed(2)}</td>`;
    const gDiffStr = `<span style="color:${gIsPos ? '#10b981' : '#ef4444'}; font-weight:700;">${gIsPos ? '+' : ''}€${Math.abs(grandDiff).toFixed(2)}</span>`;
    html += `<td style="text-align:right; padding:0.8rem;">${gDiffStr}</td>`;
    html += `</tr>`;

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}
