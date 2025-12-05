// Analytics Advanced - STL Sales Tracker
let revenueChart = null;
let platformChart = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializePeriodFilter();
    loadAnalytics();
});

// Period Filter Handler
function initializePeriodFilter() {
    const periodFilter = document.getElementById('period-filter');
    const customDateRange = document.getElementById('custom-date-range');
    const dateFrom = document.getElementById('date-from');
    const dateTo = document.getElementById('date-to');

    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    dateFrom.value = today;
    dateTo.value = today;

    periodFilter.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customDateRange.style.display = 'flex';
        } else {
            customDateRange.style.display = 'none';
            loadAnalytics();
        }
    });

    dateFrom.addEventListener('change', () => {
        if (periodFilter.value === 'custom') loadAnalytics();
    });

    dateTo.addEventListener('change', () => {
        if (periodFilter.value === 'custom') loadAnalytics();
    });
}

// Get Date Range based on selected period
function getDateRange() {
    const period = document.getElementById('period-filter').value;
    const now = new Date();
    let startDate, endDate;

    switch (period) {
        case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            endDate = new Date(now.setHours(23, 59, 59, 999));
            break;
        case 'yesterday':
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            startDate = new Date(yesterday.setHours(0, 0, 0, 0));
            endDate = new Date(yesterday.setHours(23, 59, 59, 999));
            break;
        case '7days':
            endDate = new Date();
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            break;
        case '30days':
            endDate = new Date();
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
            break;
        case 'custom':
            startDate = new Date(document.getElementById('date-from').value);
            endDate = new Date(document.getElementById('date-to').value);
            endDate.setHours(23, 59, 59, 999);
            break;
        default:
            startDate = new Date(now.setHours(0, 0, 0, 0));
            endDate = new Date(now.setHours(23, 59, 59, 999));
    }

    return { startDate, endDate };
}

// Load Analytics Data
async function loadAnalytics() {
    try {
        const { startDate, endDate } = getDateRange();

        // Fetch sales data
        const { data: sales, error } = await supabase
            .from('sales')
            .select(`
                *,
                platforms (name)
            `)
            .gte('sale_date', startDate.toISOString())
            .lte('sale_date', endDate.toISOString())
            .order('sale_date', { ascending: true });

        if (error) throw error;

        // Calculate metrics
        updateKPIs(sales);
        updateCharts(sales);
        updateTopProducts(sales);

    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Update KPI Cards
function updateKPIs(sales) {
    // Total Revenue
    const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.amount || 0), 0);
    document.getElementById('total-revenue').textContent = `€${totalRevenue.toFixed(2)}`;

    // Total Sales
    document.getElementById('total-sales').textContent = sales.length;

    // Average Order Value
    const avgValue = sales.length > 0 ? totalRevenue / sales.length : 0;
    document.getElementById('avg-value').textContent = `€${avgValue.toFixed(2)}`;

    // Best Platform
    const platformRevenue = {};
    sales.forEach(sale => {
        const platform = sale.platforms?.name || 'Unknown';
        platformRevenue[platform] = (platformRevenue[platform] || 0) + parseFloat(sale.amount || 0);
    });

    const bestPlatform = Object.entries(platformRevenue).sort((a, b) => b[1] - a[1])[0];
    if (bestPlatform) {
        document.getElementById('best-platform').textContent = bestPlatform[0];
        document.getElementById('platform-revenue').textContent = `€${bestPlatform[1].toFixed(2)}`;
    } else {
        document.getElementById('best-platform').textContent = '-';
        document.getElementById('platform-revenue').textContent = '€0.00';
    }

    // Calculate changes (placeholder - you can implement comparison logic)
    document.getElementById('revenue-change').textContent = '+0%';
    document.getElementById('sales-change').textContent = '+0%';
    document.getElementById('avg-change').textContent = '+0%';
}

// Update Charts
function updateCharts(sales) {
    updateRevenueChart(sales);
    updatePlatformChart(sales);
}

// Revenue Trend Chart
function updateRevenueChart(sales) {
    const ctx = document.getElementById('revenue-chart');
    if (!ctx) return;

    // Group sales by date
    const dailyRevenue = {};
    sales.forEach(sale => {
        const date = new Date(sale.sale_date).toLocaleDateString('it-IT');
        dailyRevenue[date] = (dailyRevenue[date] || 0) + parseFloat(sale.amount || 0);
    });

    const labels = Object.keys(dailyRevenue);
    const data = Object.values(dailyRevenue);

    if (revenueChart) revenueChart.destroy();

    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ricavi (€)',
                data: data,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#10b981',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: (context) => `€${context.parsed.y.toFixed(2)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#94a3b8',
                        callback: (value) => `€${value}`
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                }
            }
        }
    });
}

// Platform Sales Chart
function updatePlatformChart(sales) {
    const ctx = document.getElementById('platform-chart');
    if (!ctx) return;

    // Group sales by platform
    const platformSales = {};
    sales.forEach(sale => {
        const platform = sale.platforms?.name || 'Unknown';
        platformSales[platform] = (platformSales[platform] || 0) + 1;
    });

    const labels = Object.keys(platformSales);
    const data = Object.values(platformSales);

    // Platform colors
    const colors = {
        'Cults3D': '#3b82f6',
        'Pixup': '#10b981',
        'CGTrader': '#f59e0b',
        '3DExport': '#8b5cf6',
        'Unknown': '#6b7280'
    };

    const backgroundColors = labels.map(label => colors[label] || '#6b7280');

    if (platformChart) platformChart.destroy();

    platformChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Vendite',
                data: data,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: backgroundColors,
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#3b82f6',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: (context) => `${context.parsed.y} vendite`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#94a3b8',
                        stepSize: 1
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                }
            }
        }
    });
}

// Update Top Products Table
function updateTopProducts(sales) {
    const tbody = document.getElementById('top-products-body');
    if (!tbody) return;

    // Group by product
    const productStats = {};
    sales.forEach(sale => {
        const product = sale.product_name || 'Unknown';
        if (!productStats[product]) {
            productStats[product] = {
                name: product,
                platform: sale.platforms?.name || 'Unknown',
                count: 0,
                revenue: 0
            };
        }
        productStats[product].count++;
        productStats[product].revenue += parseFloat(sale.amount || 0);
    });

    // Sort by revenue
    const topProducts = Object.values(productStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    if (topProducts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    Nessun dato disponibile per il periodo selezionato
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = topProducts.map((product, index) => `
        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
            <td style="padding: 1rem; color: var(--text-secondary);">${index + 1}</td>
            <td style="padding: 1rem; color: var(--text-primary); font-weight: 500;">${product.name}</td>
            <td style="padding: 1rem; text-align: center;">
                <span style="padding: 0.25rem 0.75rem; background: rgba(16, 185, 129, 0.1); color: #10b981; border-radius: 6px; font-size: 0.875rem;">
                    ${product.platform}
                </span>
            </td>
            <td style="padding: 1rem; text-align: center; color: var(--text-primary); font-weight: 600;">${product.count}</td>
            <td style="padding: 1rem; text-align: right; color: #10b981; font-weight: 700;">€${product.revenue.toFixed(2)}</td>
        </tr>
    `).join('');
}
