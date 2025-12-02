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

    // Initialize UI Components
    setupNavigation();
    setupSound();
    setupChartControls();

    // Setup Features
    await setupModalLogic();
    requestNotificationPermission();

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
}

// --- Core Data Loading ---
async function loadDashboardData() {
    try {
        await Promise.all([
            loadStats(),
            loadChartData('7'),
            loadTopPlatforms(),
            loadRecentSales(currentSalesLimit)
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
        const date = new Date(sale.sale_date).toLocaleDateString('it-IT', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });

        const row = `
        <tr>
            <td data-label="Piattaforma">
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span style="font-weight:600;">${sale.platforms?.name || 'Unknown'}</span>
                </div>
            </td>
            <td data-label="Prodotto">${sale.product_name || '-'}</td>
            <td data-label="Data">${date}</td>
            <td data-label="Importo" style="font-weight:bold; color:#10b981;">€${sale.amount.toFixed(2)}</td>
        </tr>
        `;
        tbody.innerHTML += row;
    });
}

// --- Top Platforms ---
async function loadTopPlatforms() {
    try {
        const today = new Date().toISOString().split('T')[0];

        // We use a view or direct query. Assuming 'daily_sales_by_platform' view exists or we aggregate manually
        // For simplicity and robustness, let's aggregate manually from sales of today
        const { data: sales } = await supabase
            .from('sales')
            .select('amount, platforms(name)')
            .gte('sale_date', today);

        const container = document.getElementById('platform-list');
        if (!container) return;
        container.innerHTML = '';

        if (!sales || sales.length === 0) {
            container.innerHTML = '<div style="padding:1rem; text-align:center; color:#94a3b8;">Nessuna vendita oggi</div>';
            return;
        }

        // Aggregate
        const stats = {};
        sales.forEach(sale => {
            const name = sale.platforms?.name || 'Unknown';
            if (!stats[name]) stats[name] = { count: 0, amount: 0 };
            stats[name].count++;
            stats[name].amount += sale.amount;
        });

        // Sort
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

    // Calculate Date Range
    let queryStart, queryEnd;
    const today = new Date();

    if (period === 'custom' && startDate && endDate) {
        queryStart = startDate;
        queryEnd = endDate;
    } else if (period === 'today') {
        queryStart = today.toISOString().split('T')[0];
        queryEnd = queryStart;
    } else if (period === 'yesterday') {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        queryStart = y.toISOString().split('T')[0];
        queryEnd = queryStart;
    } else {
        const days = parseInt(period);
        const d = new Date(today);
        d.setDate(d.getDate() - days + 1);
        queryStart = d.toISOString().split('T')[0];
        queryEnd = today.toISOString().split('T')[0];
    }

    // Fetch Data
    const { data, error } = await supabase
        .from('sales') // Querying sales directly is safer if daily_totals view is missing/broken
        .select('sale_date, amount')
        .gte('sale_date', queryStart)
        .lte('sale_date', queryEnd + 'T23:59:59');

    let labels = [];
    let values = [];

    if (data && data.length > 0) {
        const aggregated = {};

        // Initialize all days in range with 0
        const start = new Date(queryStart);
        const end = new Date(queryEnd);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            aggregated[d.toISOString().split('T')[0]] = 0;
        }

        // Fill with data
        data.forEach(s => {
            const day = s.sale_date.split('T')[0];
            if (aggregated[day] !== undefined) aggregated[day] += s.amount;
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

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function showNotification(title, body) {
    if (CONFIG.enablePushNotifications && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
    }
    console.log(`${title}: ${body}`);
}

function startAutoRefresh() {
    setInterval(loadDashboardData, CONFIG.emailCheckInterval);
}
