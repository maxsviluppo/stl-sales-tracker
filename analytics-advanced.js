// Analytics Advanced - STL Sales Tracker
let mainChart = null;
let currentChartIndex = 0;
let currentPlatformIndex = 0;
let salesData = [];
let platformsData = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializePeriodFilter();
    initializeChartSlider();
    initializePlatformSlider();
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
        updatePlatformMetrics(sales);
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

// Chart Slider Handler
function initializeChartSlider() {
    const prevBtn = document.getElementById('prev-chart');
    const nextBtn = document.getElementById('next-chart');
    const indicators = document.querySelectorAll('.chart-indicator');

    prevBtn.addEventListener('click', () => {
        currentChartIndex = currentChartIndex === 0 ? 1 : 0;
        updateChartDisplay();
    });

    nextBtn.addEventListener('click', () => {
        currentChartIndex = currentChartIndex === 0 ? 1 : 0;
        updateChartDisplay();
    });

    indicators.forEach(indicator => {
        indicator.addEventListener('click', (e) => {
            currentChartIndex = parseInt(e.target.dataset.chart);
            updateChartDisplay();
        });
    });
}

function updateChartDisplay() {
    const indicators = document.querySelectorAll('.chart-indicator');
    indicators.forEach((ind, idx) => {
        if (idx === currentChartIndex) {
            ind.style.background = '#10b981';
            ind.classList.add('active');
        } else {
            ind.style.background = 'rgba(255,255,255,0.2)';
            ind.classList.remove('active');
        }
    });

    if (currentChartIndex === 0) {
        updateRevenueChart(salesData);
    } else {
        updatePlatformChart(salesData);
    }
}

// Update Charts
function updateCharts(sales) {
    salesData = sales;
    updateChartDisplay();
}

// Revenue Trend Chart
function updateRevenueChart(sales) {
    const ctx = document.getElementById('main-chart');
    if (!ctx) return;

    const chartTitle = document.getElementById('chart-title');
    chartTitle.innerHTML = '<i class="fa-solid fa-chart-line" style="color: #10b981;"></i> Trend Ricavi';

    // Group sales by date
    const dailyRevenue = {};
    sales.forEach(sale => {
        const date = new Date(sale.sale_date).toLocaleDateString('it-IT');
        dailyRevenue[date] = (dailyRevenue[date] || 0) + parseFloat(sale.amount || 0);
    });

    const labels = Object.keys(dailyRevenue);
    const data = Object.values(dailyRevenue);

    if (mainChart) mainChart.destroy();

    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ricavi (€)',
                data: data,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 7
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
    const ctx = document.getElementById('main-chart');
    if (!ctx) return;

    const chartTitle = document.getElementById('chart-title');
    chartTitle.innerHTML = '<i class="fa-solid fa-layer-group" style="color: #3b82f6;"></i> Vendite per Piattaforma';

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

    if (mainChart) mainChart.destroy();

    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Vendite',
                data: data,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: backgroundColors,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 7
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
                count: 0
            };
        }
        productStats[product].count++;
    });

    // Sort by count
    const topProducts = Object.values(productStats)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    if (topProducts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
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
        </tr>
    `).join('');
}

// Platform Slider Handler
function initializePlatformSlider() {
    const prevBtn = document.getElementById('prev-platform');
    const nextBtn = document.getElementById('next-platform');

    prevBtn.addEventListener('click', () => {
        if (platformsData.length > 0) {
            currentPlatformIndex = currentPlatformIndex === 0 ? platformsData.length - 1 : currentPlatformIndex - 1;
            updatePlatformDisplay();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (platformsData.length > 0) {
            currentPlatformIndex = (currentPlatformIndex + 1) % platformsData.length;
            updatePlatformDisplay();
        }
    });
}

function updatePlatformMetrics(sales) {
    // Group by platform
    const platformStats = {};
    sales.forEach(sale => {
        const platform = sale.platforms?.name || 'Unknown';
        if (!platformStats[platform]) {
            platformStats[platform] = {
                name: platform,
                sales: 0,
                revenue: 0
            };
        }
        platformStats[platform].sales++;
        platformStats[platform].revenue += parseFloat(sale.amount || 0);
    });

    platformsData = Object.values(platformStats).sort((a, b) => b.revenue - a.revenue);

    // Create indicators
    const indicatorsContainer = document.getElementById('platform-indicators');
    if (indicatorsContainer) {
        indicatorsContainer.innerHTML = platformsData.map((_, index) =>
            `<span class="platform-indicator ${index === 0 ? 'active' : ''}" data-platform="${index}" style="width: 8px; height: 8px; background: ${index === 0 ? '#8b5cf6' : 'rgba(255,255,255,0.2)'}; border-radius: 50%; cursor: pointer; transition: all 0.3s;"></span>`
        ).join('');

        // Add click handlers to indicators
        document.querySelectorAll('.platform-indicator').forEach(indicator => {
            indicator.addEventListener('click', (e) => {
                currentPlatformIndex = parseInt(e.target.dataset.platform);
                updatePlatformDisplay();
            });
        });
    }

    updatePlatformDisplay();
}

function updatePlatformDisplay() {
    if (platformsData.length === 0) {
        const container = document.getElementById('platform-metrics-container');
        if (container) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">Nessun dato disponibile</p>';
        }
        return;
    }

    const platform = platformsData[currentPlatformIndex];
    const colors = {
        'Cults3D': '#3b82f6',
        'Pixup': '#10b981',
        'CGTrader': '#f59e0b',
        '3DExport': '#8b5cf6',
        'Unknown': '#6b7280'
    };
    const color = colors[platform.name] || '#8b5cf6';

    const container = document.getElementById('platform-metrics-container');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, ${color}40, ${color}10); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                    <i class="fa-solid fa-layer-group" style="color: ${color}; font-size: 2.5rem;"></i>
                </div>
                <h2 style="color: var(--text-primary); font-size: 2rem; font-weight: 700; margin-bottom: 2rem;">${platform.name}</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; max-width: 500px; margin: 0 auto;">
                    <div>
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.5rem;">Vendite</p>
                        <h3 style="color: ${color}; font-size: 2.5rem; font-weight: 700;">${platform.sales}</h3>
                    </div>
                    <div>
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.5rem;">Ricavi</p>
                        <h3 style="color: ${color}; font-size: 2.5rem; font-weight: 700;">€${platform.revenue.toFixed(2)}</h3>
                    </div>
                </div>
            </div>
        `;
    }

    // Update indicators
    document.querySelectorAll('.platform-indicator').forEach((ind, idx) => {
        if (idx === currentPlatformIndex) {
            ind.style.background = '#8b5cf6';
            ind.classList.add('active');
        } else {
            ind.style.background = 'rgba(255,255,255,0.2)';
            ind.classList.remove('active');
        }
    });
}
