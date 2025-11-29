// Advanced Analytics with Charts and Comparisons

let comparisonChart = null;
let revenueDistChart = null;
let salesDistChart = null;
let currentChartType = 'line';

// Platform colors
const platformColors = {
    'Cults3D': '#6366f1',
    'Pixup': '#10b981',
    'CGTrader': '#f59e0b',
    '3DExport': '#ec4899'
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadAllAnalytics();
    setupEventListeners();
});

async function loadAllAnalytics() {
    try {
        await loadPlatformsSummary();
        await loadComparisonChart();
        await loadDistributionCharts();
        await loadTopProducts();
        await loadProductsByPlatform();
        await populatePlatformFilter();
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

async function loadPlatformsSummary() {
    const { data, error } = await supabase
        .from('platform_performance_summary')
        .select('*')
        .order('total_revenue', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    const container = document.getElementById('platforms-summary');
    if (!container) return;

    container.innerHTML = '';

    // Create table with all metrics (no averages)
    let html = `
        <div class="table-responsive">
            <table class="sales-table">
                <thead>
                    <tr>
                        <th>Piattaforma</th>
                        <th colspan="2" style="text-align: center; border-bottom: 1px solid var(--border-color);">Giornaliero</th>
                        <th colspan="2" style="text-align: center; border-bottom: 1px solid var(--border-color);">Mensile</th>
                        <th colspan="2" style="text-align: center; border-bottom: 1px solid var(--border-color);">Annuale</th>
                        <th>Prodotti</th>
                    </tr>
                    <tr style="font-size: 0.85rem; color: var(--text-secondary);">
                        <th></th>
                        <th>Vendite</th>
                        <th>Ricavo</th>
                        <th>Vendite</th>
                        <th>Ricavo</th>
                        <th>Vendite</th>
                        <th>Ricavo</th>
                        <th>Unici</th>
                    </tr>
                </thead>
                <tbody>
    `;

    for (const platform of data) {
        // Get daily stats
        const { data: dailyData } = await supabase
            .from('platform_stats_daily')
            .select('*')
            .eq('platform_id', platform.id)
            .eq('sale_day', new Date().toISOString().split('T')[0])
            .maybeSingle();

        // Get monthly stats
        const { data: monthlyData } = await supabase
            .from('platform_stats_monthly')
            .select('*')
            .eq('platform_id', platform.id)
            .gte('month', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
            .maybeSingle();

        // Get yearly stats
        const { data: yearlyData } = await supabase
            .from('platform_stats_yearly')
            .select('*')
            .eq('platform_id', platform.id)
            .gte('year', new Date(new Date().getFullYear(), 0, 1).toISOString())
            .maybeSingle();

        const color = platformColors[platform.name] || '#6366f1';

        html += `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${color};"></div>
                        <strong>${platform.name}</strong>
                    </div>
                </td>
                <td>${dailyData?.total_sales || 0}</td>
                <td style="color: var(--accent-color); font-weight: 600;">€${(dailyData?.total_amount || 0).toFixed(2)}</td>
                <td>${monthlyData?.total_sales || 0}</td>
                <td style="color: var(--accent-color); font-weight: 600;">€${(monthlyData?.total_amount || 0).toFixed(2)}</td>
                <td>${yearlyData?.total_sales || 0}</td>
                <td style="color: var(--accent-color); font-weight: 600;">€${(yearlyData?.total_amount || 0).toFixed(2)}</td>
                <td><span class="status-badge status-completed">${platform.unique_products || 0}</span></td>
            </tr>
        `;
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

async function loadComparisonChart() {
    const metric = document.getElementById('chart-metric')?.value || 'revenue';
    const days = parseInt(document.getElementById('chart-timeframe')?.value || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: platforms } = await supabase.from('platforms').select('*');
    if (!platforms) return;

    const datasets = [];

    for (const platform of platforms) {
        const { data } = await supabase
            .from('platform_stats_daily')
            .select('*')
            .eq('platform_id', platform.id)
            .gte('sale_day', startDate.toISOString().split('T')[0])
            .order('sale_day', { ascending: true });

        if (!data || data.length === 0) continue;

        const values = data.map(d => {
            if (metric === 'revenue') return parseFloat(d.total_amount);
            if (metric === 'sales') return d.total_sales;
            if (metric === 'avg') return parseFloat(d.avg_amount);
            return 0;
        });

        datasets.push({
            label: platform.name,
            data: values,
            borderColor: platformColors[platform.name] || '#6366f1',
            backgroundColor: (platformColors[platform.name] || '#6366f1') + '20',
            tension: 0.4,
            fill: currentChartType === 'line'
        });
    }

    const labels = datasets[0]?.data.map((_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
    }) || [];

    const ctx = document.getElementById('comparisonChart');
    if (!ctx) return;

    if (comparisonChart) {
        comparisonChart.destroy();
    }

    comparisonChart = new Chart(ctx, {
        type: currentChartType,
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#f8fafc' }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                },
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                }
            }
        }
    });
}

async function loadDistributionCharts() {
    const { data } = await supabase
        .from('platform_performance_summary')
        .select('*')
        .order('total_revenue', { ascending: false });

    if (!data) return;

    const labels = data.map(p => p.name);
    const revenues = data.map(p => parseFloat(p.total_revenue || 0));
    const sales = data.map(p => p.total_sales || 0);
    const colors = labels.map(name => platformColors[name] || '#6366f1');

    // Revenue Distribution
    const revenueCtx = document.getElementById('revenueDistChart');
    if (revenueCtx) {
        if (revenueDistChart) revenueDistChart.destroy();
        revenueDistChart = new Chart(revenueCtx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: revenues,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#0f172a'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#f8fafc', padding: 15 }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: €${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Sales Distribution
    const salesCtx = document.getElementById('salesDistChart');
    if (salesCtx) {
        if (salesDistChart) salesDistChart.destroy();
        salesDistChart = new Chart(salesCtx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: sales,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#0f172a'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#f8fafc', padding: 15 }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} vendite (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

async function loadTopProducts() {
    const { data, error } = await supabase
        .from('top_products_overall')
        .select('*')
        .limit(20);

    if (error) {
        console.error('Error:', error);
        return;
    }

    const tbody = document.getElementById('top-products-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #94a3b8;">Nessun prodotto trovato</td></tr>';
        return;
    }

    data.forEach((product, index) => {
        const row = `
            <tr>
                <td>
                    <span style="background: ${index < 3 ? 'var(--accent-color)' : '#334155'}; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 0.875rem; font-weight: 600;">
                        ${index + 1}
                    </span>
                </td>
                <td><strong>${product.product_name}</strong></td>
                <td>${product.total_sales}</td>
                <td style="color: var(--accent-color); font-weight: 600;">€${product.total_revenue.toFixed(2)}</td>
                <td>€${product.avg_price.toFixed(2)}</td>
                <td><span style="font-size: 0.875rem; color: #94a3b8;">${product.platforms || 'N/A'}</span></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

async function loadProductsByPlatform(platformId = null) {
    let query = supabase
        .from('product_performance')
        .select('*')
        .order('total_revenue', { ascending: false });

    if (platformId) {
        const { data: platform } = await supabase
            .from('platforms')
            .select('name')
            .eq('id', platformId)
            .single();

        if (platform) {
            query = query.eq('platform_name', platform.name);
        }
    }

    const { data, error } = await query.limit(100);

    if (error) {
        console.error('Error:', error);
        return;
    }

    const tbody = document.getElementById('products-by-platform-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #94a3b8;">Nessun prodotto trovato</td></tr>';
        return;
    }

    data.forEach(product => {
        const firstSale = new Date(product.first_sale).toLocaleDateString('it-IT');
        const lastSale = new Date(product.last_sale).toLocaleDateString('it-IT');
        const color = platformColors[product.platform_name] || '#6366f1';

        const row = `
            <tr>
                <td>${product.product_name}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></div>
                        <span class="status-badge status-completed">${product.platform_name}</span>
                    </div>
                </td>
                <td>${product.times_sold}</td>
                <td style="color: var(--accent-color); font-weight: 600;">€${product.total_revenue.toFixed(2)}</td>
                <td>€${product.avg_price.toFixed(2)}</td>
                <td style="font-size: 0.875rem; color: #94a3b8;">${firstSale}</td>
                <td style="font-size: 0.875rem; color: #94a3b8;">${lastSale}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

async function populatePlatformFilter() {
    const { data } = await supabase.from('platforms').select('*').order('name');
    const filter = document.getElementById('platform-filter');
    if (!filter || !data) return;

    filter.innerHTML = '<option value="">Tutte le piattaforme</option>';
    data.forEach(p => {
        filter.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    });
}

function setupEventListeners() {
    // Chart controls
    const metricSelect = document.getElementById('chart-metric');
    const timeframeSelect = document.getElementById('chart-timeframe');
    const lineBtn = document.getElementById('chart-type-line');
    const barBtn = document.getElementById('chart-type-bar');

    if (metricSelect) {
        metricSelect.addEventListener('change', loadComparisonChart);
    }

    if (timeframeSelect) {
        timeframeSelect.addEventListener('change', loadComparisonChart);
    }

    if (lineBtn) {
        lineBtn.addEventListener('click', () => {
            currentChartType = 'line';
            lineBtn.style.color = 'var(--accent-color)';
            if (barBtn) barBtn.style.color = '';
            loadComparisonChart();
        });
    }

    if (barBtn) {
        barBtn.addEventListener('click', () => {
            currentChartType = 'bar';
            barBtn.style.color = 'var(--accent-color)';
            if (lineBtn) lineBtn.style.color = '';
            loadComparisonChart();
        });
    }

    // Platform filter
    const platformFilter = document.getElementById('platform-filter');
    if (platformFilter) {
        platformFilter.addEventListener('change', (e) => {
            loadProductsByPlatform(e.target.value || null);
        });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refresh-analytics-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            const icon = refreshBtn.querySelector('i');
            icon.classList.add('fa-spin');
            await loadAllAnalytics();
            setTimeout(() => icon.classList.remove('fa-spin'), 1000);
        });
    }
}
