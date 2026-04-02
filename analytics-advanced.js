// Advanced Analytics - Logic completamente client-side (no DB views)
let comparisonChart = null;
let revenueDistChart = null;
let salesDistChart = null;
let currentChartType = 'line';
let allSalesData = []; // Cache dei dati

const platformColors = {
    'Cults3D':  { main: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
    'Pixup':    { main: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
    'CGTrader': { main: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
    '3DExport': { main: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' }
};

// Recupera il client Supabase in modo sicuro
function getSupabase() {
    const client = window.supabase;
    if (!client || typeof client.from !== 'function') {
        throw new Error('Client Supabase non inizializzato. Ricarica la pagina.');
    }
    return client;
}

// Helper: data locale YYYY-MM-DD
function localDateStr(date) {
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().split('T')[0];
}

document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    await loadAllAnalytics();
});

// Attendi che window.supabase sia un client valido (max 5s)
async function waitForSupabase() {
    const maxWait = 5000;
    const interval = 50;
    let elapsed = 0;
    while (elapsed < maxWait) {
        const client = window.supabase;
        if (client && typeof client.from === 'function') return client;
        await new Promise(r => setTimeout(r, interval));
        elapsed += interval;
    }
    throw new Error('Timeout: Supabase non disponibile. Verifica la connessione e ricarica.');
}

async function loadAllAnalytics() {
    showLoading();
    try {
        const db = await waitForSupabase();

        const { data, error } = await db
            .from('sales')
            .select('id, amount, sale_date, product_name, platforms(name)')
            .order('sale_date', { ascending: false });

        if (error) throw error;
        allSalesData = data || [];

        renderComparisonChart();
        renderDistributionCharts();
        renderTopProducts();
        renderProductsByPlatform();
        populatePlatformFilter();

    } catch (err) {
        console.error('❌ Analytics error:', err);
        showError('Errore: ' + err.message);
    }
}



// ─────────────────────────────────────────
// SEZIONE 2: Grafico Confronto nel Tempo
// ─────────────────────────────────────────
function renderComparisonChart() {
    const metric = document.getElementById('chart-metric')?.value || 'revenue';
    const days = parseInt(document.getElementById('chart-timeframe')?.value || '30');

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days + 1);

    // Genera array di date
    const dateLabels = [];
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
        dateLabels.push(localDateStr(new Date(d)));
    }

    const platforms = Object.keys(platformColors);
    const datasets = platforms.map(pname => {
        const salesByDay = {};
        dateLabels.forEach(d => { salesByDay[d] = { revenue: 0, sales: 0 }; });

        allSalesData.forEach(sale => {
            if (sale.platforms?.name !== pname) return;
            const dateStr = localDateStr(new Date(sale.sale_date));
            if (salesByDay[dateStr] !== undefined) {
                salesByDay[dateStr].revenue += parseFloat(sale.amount) || 0;
                salesByDay[dateStr].sales++;
            }
        });

        const values = dateLabels.map(d => {
            if (metric === 'revenue') return salesByDay[d].revenue;
            if (metric === 'sales')   return salesByDay[d].sales;
            if (metric === 'avg')     return salesByDay[d].sales > 0 ? salesByDay[d].revenue / salesByDay[d].sales : 0;
            return 0;
        });

        // Salta piattaforme senza dati in range
        const hasData = values.some(v => v > 0);
        if (!hasData) return null;

        const color = platformColors[pname]?.main || '#6366f1';
        return {
            label: pname,
            data: values,
            borderColor: color,
            backgroundColor: color + '20',
            tension: 0.4,
            fill: currentChartType === 'line',
            pointRadius: 3,
            pointHoverRadius: 6,
            borderWidth: 2
        };
    }).filter(Boolean);

    const displayLabels = dateLabels.map(d => {
        const [, m, day] = d.split('-');
        return `${day}/${m}`;
    });

    const ctx = document.getElementById('comparisonChart');
    if (!ctx) return;

    if (comparisonChart) comparisonChart.destroy();

    if (datasets.length === 0) {
        ctx.parentElement.innerHTML = '<div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="fa-solid fa-chart-area" style="font-size:3rem;margin-bottom:1rem;display:block;opacity:0.3"></i>Nessun dato nel periodo selezionato</div>';
        return;
    }

    comparisonChart = new Chart(ctx, {
        type: currentChartType,
        data: { labels: displayLabels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            animation: { duration: 600, easing: 'easeInOutQuart' },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#f8fafc', padding: 15, usePointStyle: true, pointStyle: 'circle', boxWidth: 8 }
                },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.95)', titleColor: '#10b981',
                    bodyColor: '#f8fafc', borderColor: '#10b981', borderWidth: 1, padding: 12,
                    callbacks: {
                        label: ctx => {
                            const m = document.getElementById('chart-metric')?.value || 'revenue';
                            const v = ctx.parsed.y;
                            return ` ${ctx.dataset.label}: ${(m === 'sales') ? v + ' vendite' : '€' + v.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#94a3b8', callback: v => document.getElementById('chart-metric')?.value === 'sales' ? v : '€' + v.toFixed(0) },
                    grid: { color: 'rgba(51,65,85,0.5)' }
                },
                x: {
                    ticks: { color: '#94a3b8', maxRotation: 45, font: { size: 10 } },
                    grid: { color: 'rgba(51,65,85,0.3)' }
                }
            }
        }
    });
}

// ─────────────────────────────────────────
// SEZIONE 3: Grafici a Torta
// ─────────────────────────────────────────
function renderDistributionCharts() {
    const platforms = Object.keys(platformColors);
    const revenues = {};
    const sales = {};
    platforms.forEach(p => { revenues[p] = 0; sales[p] = 0; });

    allSalesData.forEach(sale => {
        const pname = sale.platforms?.name;
        if (!revenues[pname] === undefined) return;
        revenues[pname] = (revenues[pname] || 0) + (parseFloat(sale.amount) || 0);
        sales[pname]    = (sales[pname] || 0) + 1;
    });

    const labels = platforms;
    const colors = platforms.map(p => platformColors[p]?.main || '#6366f1');
    const doughnutOptions = (suffix) => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: { animateRotate: true, animateScale: true, duration: 800 },
        plugins: {
            legend: { position: 'bottom', labels: { color: '#f8fafc', padding: 10, usePointStyle: true, font: { size: 11 } } },
            tooltip: {
                backgroundColor: 'rgba(15,23,42,0.95)', titleColor: '#10b981',
                bodyColor: '#f8fafc', borderColor: '#10b981', borderWidth: 1, padding: 10,
                callbacks: {
                    label: ctx => {
                        const total = ctx.dataset.data.reduce((a,b) => a+b, 0);
                        const pct = ((ctx.parsed / total) * 100).toFixed(1);
                        return ` ${ctx.label}: ${suffix === '€' ? '€' + ctx.parsed.toFixed(2) : ctx.parsed + ' vendite'} (${pct}%)`;
                    }
                }
            }
        }
    });

    const revCtx = document.getElementById('revenueDistChart');
    if (revCtx) {
        if (revenueDistChart) revenueDistChart.destroy();
        revenueDistChart = new Chart(revCtx, {
            type: 'doughnut',
            data: { labels, datasets: [{ data: platforms.map(p => revenues[p] || 0), backgroundColor: colors, borderWidth: 3, borderColor: '#0f172a', hoverOffset: 8 }] },
            options: doughnutOptions('€')
        });
    }

    const salCtx = document.getElementById('salesDistChart');
    if (salCtx) {
        if (salesDistChart) salesDistChart.destroy();
        salesDistChart = new Chart(salCtx, {
            type: 'doughnut',
            data: { labels, datasets: [{ data: platforms.map(p => sales[p] || 0), backgroundColor: colors, borderWidth: 3, borderColor: '#0f172a', hoverOffset: 8 }] },
            options: doughnutOptions('n')
        });
    }
}

// ─────────────────────────────────────────
// SEZIONE 4: Top Prodotti
// ─────────────────────────────────────────
// ─────────────────────────────────────────
// SEZIONE 4: Top Prodotti (con Ordinamento)
// ─────────────────────────────────────────
function renderTopProducts() {
    const sortMode = document.getElementById('top-products-sort')?.value || 'revenue';
    const productMap = {};

    allSalesData.forEach(sale => {
        const name = sale.product_name || 'N/D';
        const pname = sale.platforms?.name || 'N/D';
        const amt = parseFloat(sale.amount) || 0;

        if (!productMap[name]) {
            productMap[name] = { name: name, revenue: 0, sales: 0, platforms: new Set() };
        }
        productMap[name].revenue += amt;
        productMap[name].sales++;
        productMap[name].platforms.add(pname);
    });

    const sorted = Object.values(productMap).sort((a, b) => {
        return sortMode === 'revenue' ? b.revenue - a.revenue : b.sales - a.sales;
    }).slice(0, 20);

    const tbody = document.getElementById('top-products-body');
    if (!tbody) return;

    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;">Nessun dato</td></tr>';
        return;
    }

    tbody.innerHTML = sorted.map((p, i) => `
        <tr class="product-row-mobile">
            <td class="desktop-only text-center">
                <span class="rank-badge ${i < 3 ? 'top-rank' : ''}">${i + 1}</span>
            </td>
            <td class="product-info-cell">
                <div class="mobile-rank-header">
                    <span class="rank-badge ${i < 3 ? 'top-rank' : ''}">${i + 1}</span>
                    <strong class="product-name-text">${p.name}</strong>
                </div>
                <div class="product-meta-row">
                    <span class="meta-label"><i class="fa-solid fa-layer-group"></i> ${[...p.platforms].join(', ')}</span>
                </div>
            </td>
            <td class="stat-cell" data-label="Pezzi">
                <span class="stat-main">${p.sales}</span>
                <span class="stat-sub">venduti</span>
            </td>
            <td class="stat-cell" data-label="Ricavo">
                <span class="stat-main accent-color">€${p.revenue.toFixed(2)}</span>
            </td>
            <td class="desktop-only">
                <span class="platform-tags">${[...p.platforms].join(' · ')}</span>
            </td>
        </tr>
    `).join('');
}

// ─────────────────────────────────────────
// SEZIONE 5: Dettaglio Piattaforme (Ordinato)
// ─────────────────────────────────────────
function renderProductsByPlatform(platformFilter = null) {
    const sortMode = document.getElementById('platform-products-sort')?.value || 'revenue';
    const productMap = {};

    allSalesData.forEach(sale => {
        const pname = sale.platforms?.name || 'N/D';
        if (platformFilter && pname !== platformFilter) return;

        const name = sale.product_name || 'N/D';
        const amt = parseFloat(sale.amount) || 0;
        const date = localDateStr(new Date(sale.sale_date));
        const key = `${pname}::${name}`;

        if (!productMap[key]) {
            productMap[key] = { name, platform: pname, revenue: 0, sales: 0, first: date, last: date };
        }
        productMap[key].revenue += amt;
        productMap[key].sales++;
        if (date < productMap[key].first) productMap[key].first = date;
        if (date > productMap[key].last) productMap[key].last = date;
    });

    const sorted = Object.values(productMap).sort((a, b) => {
        return sortMode === 'revenue' ? b.revenue - a.revenue : b.sales - a.sales;
    }).slice(0, 100);

    const tbody = document.getElementById('products-by-platform-body');
    if (!tbody) return;

    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;">Nessun dato</td></tr>';
        return;
    }

    const fmt = d => d ? d.split('-').reverse().slice(0, 2).join('/') : '—';
    const color = p => platformColors[p]?.main || '#94a3b8';

    tbody.innerHTML = sorted.map(p => `
        <tr class="product-row-mobile">
            <td class="product-info-cell">
                <strong class="product-name-text">${p.name}</strong>
                <div class="mobile-platform-box" style="color: ${color(p.platform)}; border-color: ${color(p.platform)}22; background: ${color(p.platform)}11;">
                    ${p.platform}
                </div>
            </td>
            <td class="desktop-only">
                <span class="platform-badge" style="background:${color(p.platform)}22; color:${color(p.platform)}">${p.platform}</span>
            </td>
            <td class="stat-cell" data-label="N.">
                <span class="stat-main">${p.sales}</span>
            </td>
            <td class="stat-cell" data-label="Ricavo">
                <span class="stat-main accent-color">€${p.revenue.toFixed(2)}</span>
            </td>
            <td class="stat-cell desktop-only" data-label="Periodo">
                <span class="date-text">${fmt(p.first)} — ${fmt(p.last)}</span>
            </td>
        </tr>
    `).join('');
}

// ─────────────────────────────────────────
// Event Listeners
// ─────────────────────────────────────────
function setupEventListeners() {
    const metricSel = document.getElementById('chart-metric');
    const timeSel   = document.getElementById('chart-timeframe');
    const lineBtn   = document.getElementById('chart-type-line');
    const barBtn    = document.getElementById('chart-type-bar');
    const platFilt  = document.getElementById('platform-filter');
    const refreshBtn = document.getElementById('refresh-analytics-btn');

    const topSort   = document.getElementById('top-products-sort');
    const platSort  = document.getElementById('platform-products-sort');

    metricSel?.addEventListener('change', renderComparisonChart);
    timeSel?.addEventListener('change', renderComparisonChart);

    topSort?.addEventListener('change', renderTopProducts);
    platSort?.addEventListener('change', () => renderProductsByPlatform(platFilt.value));

    lineBtn?.addEventListener('click', () => {
        currentChartType = 'line';
        lineBtn.style.color = '#10b981'; barBtn.style.color = '';
        renderComparisonChart();
    });
    barBtn?.addEventListener('click', () => {
        currentChartType = 'bar';
        barBtn.style.color = '#10b981'; lineBtn.style.color = '';
        renderComparisonChart();
    });

    platFilt?.addEventListener('change', e => {
        renderProductsByPlatform(e.target.value || null);
    });

    refreshBtn?.addEventListener('click', async () => {
        const icon = refreshBtn.querySelector('i');
        icon?.classList.add('fa-spin');
        await loadAllAnalytics();
        setTimeout(() => icon?.classList.remove('fa-spin'), 800);
    });

    populatePlatformFilter();
}

// ─────────────────────────────────────────
// SEZIONE 6: Popola Filtro
// ─────────────────────────────────────────
function populatePlatformFilter() {
    const platFilt = document.getElementById('platform-filter');
    if (!platFilt || allSalesData.length === 0) return;

    const platforms = [...new Set(allSalesData.map(s => s.platforms?.name).filter(Boolean))].sort();
    platFilt.innerHTML = '<option value="">Tutte le piattaforme</option>' +
        platforms.map(p => `<option value="${p}">${p}</option>`).join('');
}

// ─────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────
function showLoading() {
    const container = document.getElementById('platforms-summary');
    if (container) container.innerHTML = `
        <div style="text-align:center;padding:3rem;color:#94a3b8;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;color:#10b981;"></i>
            <div style="margin-top:1rem;">Caricamento analytics...</div>
        </div>`;
}
function showError(msg) {
    const container = document.getElementById('platforms-summary');
    if (container) container.innerHTML = `
        <div style="text-align:center;padding:2rem;color:#ef4444;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;margin-bottom:1rem;display:block;"></i>
            ${msg}
        </div>`;
}
