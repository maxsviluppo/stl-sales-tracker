// STL Sales Tracker - Core Logic

// Global state for tracking sales
let lastSalesCount = 0;
let isFirstLoad = true;
let selectedPlatformId = null; // null = all platforms

document.addEventListener('DOMContentLoaded', async () => {
    console.log('STL Sales Tracker Initialized');

    // Initialize UI
    setupNavigation();
    setupSound();
    requestNotificationPermission();

    // Load Data
    await loadDashboardData();

    // Setup Refresh Button
    document.getElementById('refresh-btn').addEventListener('click', async () => {
        const btn = document.getElementById('refresh-btn');
        const icon = btn.querySelector('i');

        icon.classList.add('fa-spin');
        await loadDashboardData();
        setTimeout(() => icon.classList.remove('fa-spin'), 1000);
    });

    // Start auto-refresh every 2 hours (matches email check interval)
    startAutoRefresh();

    // Setup Settings Toggles
    const soundToggle = document.getElementById('sound-toggle');
    const notificationToggle = document.getElementById('notification-toggle');

    if (soundToggle) {
        soundToggle.addEventListener('change', (e) => {
            CONFIG.notificationSound = e.target.checked;
            console.log('Sound notifications:', CONFIG.notificationSound);
        });
    }

    if (notificationToggle) {
        notificationToggle.addEventListener('change', (e) => {
            CONFIG.enablePushNotifications = e.target.checked;
            console.log('Push notifications:', CONFIG.enablePushNotifications);
            if (e.target.checked) {
                requestNotificationPermission();
            }
        });
    }

    // Setup Platform Filter
    await setupPlatformFilter();
});

// --- Platform Filter ---
async function setupPlatformFilter() {
    const filterContainer = document.querySelector('.page-title');
    if (!filterContainer) return;

    // Add filter dropdown after subtitle
    const filterHTML = `
        <div style="margin-top: 1rem;">
            <select id="dashboard-platform-filter" style="padding: 0.6rem 1rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); font-size: 0.9rem; cursor: pointer;">
                <option value="">📊 Tutte le Piattaforme</option>
            </select>
        </div>
    `;
    filterContainer.insertAdjacentHTML('beforeend', filterHTML);

    // Populate filter
    const { data: platforms } = await supabase.from('platforms').select('*').order('name');
    const select = document.getElementById('dashboard-platform-filter');

    if (platforms && select) {
        platforms.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.name;
            select.appendChild(option);
        });

        select.addEventListener('change', async (e) => {
            selectedPlatformId = e.target.value || null;
            await loadDashboardData();
        });
    }
}

// --- Navigation ---
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const currentItem = e.currentTarget;

            // Allow navigation for real links (like analytics.html)
            const href = currentItem.getAttribute('href');
            if (href && href !== '#' && !href.startsWith('javascript')) {
                return;
            }

            e.preventDefault();

            const pageId = currentItem.getAttribute('data-page');
            if (!pageId) return;

            // Remove active class from all internal nav items
            navItems.forEach(nav => {
                if (nav.getAttribute('href') === '#') {
                    nav.classList.remove('active');
                }
            });

            views.forEach(view => view.classList.remove('active'));

            // Add active to current
            currentItem.classList.add('active');
            const view = document.getElementById(`${pageId}-view`);
            if (view) view.classList.add('active');
        });
    });
}

// --- Sound System ---
function setupSound() {
    const soundBtn = document.getElementById('test-sound-btn');
    const audio = document.getElementById('cash-sound');

    soundBtn.addEventListener('click', () => {
        playCashSound();
    });
}

function playCashSound() {
    const audio = document.getElementById('cash-sound');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Audio play failed (user interaction needed first):', e));

        // Visual feedback
        const btn = document.getElementById('test-sound-btn');
        btn.style.color = '#10b981';
        setTimeout(() => btn.style.color = '', 500);
    }
}

// --- Notification System ---
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            console.log('Notification permission:', permission);
        });
    }
}

function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="80" font-size="80">💰</text></svg>',
            badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="80" font-size="80">💰</text></svg>'
        });
    }
}

// --- Auto Refresh ---
function startAutoRefresh() {
    // Check every 2 hours (7200000 ms) - matches the email check interval
    setInterval(async () => {
        console.log('Auto-refreshing dashboard...');
        await loadDashboardData();
    }, CONFIG.emailCheckInterval);
}

// --- Data Loading ---
async function loadDashboardData() {
    try {
        // 1. Load Daily Totals
        await loadDailyTotals();

        // 2. Load Recent Sales
        await loadRecentSales();

        // 3. Load Chart Data
        await loadChartData();

        // 4. Load Platform Breakdown
        await loadPlatformBreakdown();

    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

async function loadRecentSales() {
    const { data, error } = await supabase
        .from('sales')
        .select(`
            *,
            platforms (name)
        `)
        .order('sale_date', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching sales:', error);
        return;
    }

    const tbody = document.getElementById('recent-sales-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem;">Nessuna vendita recente</td></tr>';
        return;
    }

    data.forEach(sale => {
        const date = new Date(sale.sale_date).toLocaleDateString('it-IT', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });

        const row = `
        <tr>
            <td>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span style="font-weight:600;">${sale.platforms?.name || 'Unknown'}</span>
                </div>
            </td>
            <td>${sale.product_name}</td>
            <td>${date}</td>
            <td style="font-weight:bold; color:#10b981;">€${sale.amount.toFixed(2)}</td>
            <td><span class="status-badge status-completed">Completato</span></td>
        </tr>
    `;
        tbody.innerHTML += row;
    });
}

async function loadPlatformBreakdown() {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('daily_sales_by_platform')
        .select('*')
        .eq('sale_day', today)
        .order('total_amount', { ascending: false });

    const container = document.getElementById('platform-list');
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = '<div style="padding:1rem; text-align:center; color:#94a3b8;">Nessuna vendita oggi</div>';
        return;
    }

    data.forEach(item => {
        const el = `
            <div class="platform-item">
                <div class="platform-info">
                    <div class="platform-logo">${item.platform_name.substring(0, 2).toUpperCase()}</div>
                    <div>
                        <div style="font-weight:600;">${item.platform_name}</div>
                        <div style="font-size:0.8rem; color:#94a3b8;">${item.total_sales} vendite</div>
                    </div>
                </div>
                <div style="font-weight:bold;">€${item.total_amount.toFixed(2)}</div>
            </div>
        `;
        container.innerHTML += el;
    });
}

// --- Chart.js Setup ---
let salesChart = null;

async function loadChartData() {
    const ctx = document.getElementById('salesChart').getContext('2d');

    // Mock data if no real data exists yet
    // In production, fetch from Supabase 'daily_totals' view for last 7 days

    const { data } = await supabase
        .from('daily_totals')
        .select('*')
        .order('sale_day', { ascending: true })
        .limit(7);

    let labels = [];
    let values = [];

    if (data && data.length > 0) {
        labels = data.map(d => new Date(d.sale_day).toLocaleDateString('it-IT', { weekday: 'short' }));
        values = data.map(d => d.total_amount);
    } else {
        // Empty state
        labels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
        values = [0, 0, 0, 0, 0, 0, 0];
    }

    if (salesChart) salesChart.destroy();

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Incasso (€)',
                data: values,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            return '€ ' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

// --- Utilities ---
function animateValue(id, start, end, duration, isCurrency = false) {
    const obj = document.getElementById(id);
    if (!obj) return;

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);

        const value = progress * (end - start) + start;

        if (isCurrency) {
            obj.innerHTML = '€' + value.toFixed(2);
        } else {
            obj.innerHTML = Math.floor(value);
        }

        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// --- Modal Logic ---
document.addEventListener('DOMContentLoaded', async () => {
    const modal = document.getElementById('sale-modal');
    const addBtn = document.getElementById('add-sale-btn');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-btn');
    const form = document.getElementById('sale-form');
    const platformSelect = document.getElementById('platform-select');

    // Load platforms into select
    await loadPlatforms();

    // Open modal
    addBtn.addEventListener('click', () => {
        modal.classList.add('active');
    });

    // Close modal
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        form.reset();
    });

    cancelBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        form.reset();
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            form.reset();
        }
    });

    // Handle form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveSale();
    });
});

async function loadPlatforms() {
    const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .eq('active', true)
        .order('name');

    if (error) {
        console.error('Error loading platforms:', error);
        return;
    }

    const select = document.getElementById('platform-select');
    select.innerHTML = '<option value="">Seleziona piattaforma...</option>';

    data.forEach(platform => {
        const option = document.createElement('option');
        option.value = platform.id;
        option.textContent = platform.name;
        select.appendChild(option);
    });
}

async function saveSale() {
    const platformId = document.getElementById('platform-select').value;
    const productName = document.getElementById('product-name').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const currency = document.getElementById('currency').value;

    if (!platformId || !productName || !amount) {
        alert('Compila tutti i campi!');
        return;
    }

    const { data, error } = await supabase
        .from('sales')
        .insert({
            platform_id: platformId,
            product_name: productName,
            amount: amount,
            currency: currency,
            sale_date: new Date().toISOString()
        })
        .select();

    if (error) {
        console.error('Error saving sale:', error);
        alert('Errore nel salvare la vendita!');
        return;
    }

    // Success!
    playCashSound();
    document.getElementById('sale-modal').classList.remove('active');
    document.getElementById('sale-form').reset();

    // Reload dashboard
    await loadDashboardData();

    // Show success message
    showNotification('Vendita salvata con successo! 💰');
}

function showNotification(message) {
    // Simple notification (you can make this fancier)
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 5px 20px rgba(16, 185, 129, 0.4);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
