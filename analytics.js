// Analytics functions for platform and product statistics

async function loadAnalyticsData() {
    try {
        await loadPlatformsList();
        await loadPlatformStats('daily');
        await loadTopProducts();
        await loadProductsByPlatform();
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

async function loadPlatformsList() {
    const { data, error } = await supabase
        .from('platform_performance_summary')
        .select('*')
        .order('total_revenue', { ascending: false });

    if (error) {
        console.error('Error loading platforms:', error);
        return;
    }

    const container = document.getElementById('platforms-list');
    if (!container) return;

    container.innerHTML = '';

    data.forEach(platform => {
        const card = `
            <div style="padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 0.5rem; margin-bottom: 0.75rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4 style="margin-bottom: 0.25rem;">${platform.name}</h4>
                        <p style="color: #94a3b8; font-size: 0.875rem;">
                            ${platform.total_sales || 0} vendite • ${platform.unique_products || 0} prodotti
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <p style="font-size: 1.25rem; font-weight: 600; color: var(--accent-color);">
                            €${(platform.total_revenue || 0).toFixed(2)}
                        </p>
                        <p style="color: #94a3b8; font-size: 0.875rem;">
                            Media: €${(platform.avg_sale_value || 0).toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });

    // Populate platform filter
    const filter = document.getElementById('platform-filter');
    if (filter) {
        filter.innerHTML = '<option value="">Tutte le piattaforme</option>';
        data.forEach(p => {
            filter.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
    }
}

async function loadPlatformStats(period) {
    const viewName = `platform_stats_${period}`;
    const { data, error } = await supabase
        .from(viewName)
        .select('*')
        .order(period === 'daily' ? 'sale_day' : (period === 'monthly' ? 'month' : 'year'), { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error loading platform stats:', error);
        return;
    }

    const container = document.getElementById('platform-stats-content');
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 2rem;">Nessun dato disponibile</p>';
        return;
    }

    let html = '<table class="sales-table"><thead><tr>';
    html += '<th>Piattaforma</th>';
    html += period === 'daily' ? '<th>Data</th>' : (period === 'monthly' ? '<th>Mese</th>' : '<th>Anno</th>');
    html += '<th>Vendite</th><th>Ricavo</th><th>Media</th><th>Min</th><th>Max</th>';
    html += '</tr></thead><tbody>';

    data.forEach(row => {
        const dateField = period === 'daily' ? row.sale_day : (period === 'monthly' ? row.month : row.year);
        const formattedDate = new Date(dateField).toLocaleDateString('it-IT',
            period === 'daily' ? { day: '2-digit', month: '2-digit', year: 'numeric' } :
                period === 'monthly' ? { month: 'long', year: 'numeric' } :
                    { year: 'numeric' }
        );

        html += `<tr>
            <td><strong>${row.platform_name}</strong></td>
            <td>${formattedDate}</td>
            <td>${row.total_sales}</td>
            <td style="color: var(--accent-color); font-weight: 600;">€${row.total_amount.toFixed(2)}</td>
            <td>€${row.avg_amount.toFixed(2)}</td>
            <td>€${row.min_amount.toFixed(2)}</td>
            <td>€${row.max_amount.toFixed(2)}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

async function loadTopProducts() {
    const { data, error } = await supabase
        .from('top_products_overall')
        .select('*')
        .limit(20);

    if (error) {
        console.error('Error loading top products:', error);
        return;
    }

    const tbody = document.getElementById('top-products-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #94a3b8;">Nessun prodotto trovato</td></tr>';
        return;
    }

    data.forEach((product, index) => {
        const row = `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="background: var(--accent-color); color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600;">
                            ${index + 1}
                        </span>
                        <span>${product.product_name}</span>
                    </div>
                </td>
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
        // Filter by platform name since we don't have platform_id in the view
        const { data: platform } = await supabase
            .from('platforms')
            .select('name')
            .eq('id', platformId)
            .single();

        if (platform) {
            query = query.eq('platform_name', platform.name);
        }
    }

    const { data, error } = await query.limit(50);

    if (error) {
        console.error('Error loading products by platform:', error);
        return;
    }

    const tbody = document.getElementById('products-by-platform-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #94a3b8;">Nessun prodotto trovato</td></tr>';
        return;
    }

    data.forEach(product => {
        const firstSale = new Date(product.first_sale).toLocaleDateString('it-IT');
        const lastSale = new Date(product.last_sale).toLocaleDateString('it-IT');

        const row = `
            <tr>
                <td>${product.product_name}</td>
                <td><span class="status-badge status-completed">${product.platform_name}</span></td>
                <td>${product.times_sold}</td>
                <td style="color: var(--accent-color); font-weight: 600;">€${product.total_revenue.toFixed(2)}</td>
                <td>${firstSale}</td>
                <td>${lastSale}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Setup event listeners for analytics
document.addEventListener('DOMContentLoaded', () => {
    // Platform stats tabs
    const statsTabs = document.querySelectorAll('.stats-tab-btn');
    statsTabs.forEach(tab => {
        tab.addEventListener('click', async (e) => {
            statsTabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            const period = e.target.getAttribute('data-period');
            await loadPlatformStats(period);
        });
    });

    // Platform filter
    const platformFilter = document.getElementById('platform-filter');
    if (platformFilter) {
        platformFilter.addEventListener('change', async (e) => {
            await loadProductsByPlatform(e.target.value || null);
        });
    }

    // Load analytics when switching to platforms view
    const platformsNavItem = document.querySelector('[data-page="platforms"]');
    if (platformsNavItem) {
        platformsNavItem.addEventListener('click', async () => {
            await loadAnalyticsData();
        });
    }
});
