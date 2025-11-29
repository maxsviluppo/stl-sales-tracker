// Platform filter for dashboard - add to script.js

// Add this at the top with other global variables:
// let selectedPlatformId = null; // null = all platforms

// Replace loadDailyTotals function with this:
async function loadDailyTotals() {
    const today = new Date().toISOString().split('T')[0];

    if (selectedPlatformId) {
        // Filter by specific platform
        const { data, error } = await supabase
            .from('platform_stats_daily')
            .select('*')
            .eq('platform_id', selectedPlatformId)
            .eq('sale_day', today)
            .maybeSingle();

        if (error) console.error('Error:', error);

        const count = data ? data.total_sales : 0;
        const amount = data ? data.total_amount : 0;

        animateValue('today-count', 0, count, 1000);
        animateValue('today-amount', 0, amount, 1000, true);

        // Monthly stats
        const { data: monthData } = await supabase
            .from('platform_stats_monthly')
            .select('*')
            .eq('platform_id', selectedPlatformId)
            .gte('month', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
            .maybeSingle();

        const monthAmount = monthData ? monthData.total_amount : 0;
        animateValue('month-amount', 0, monthAmount, 1000, true);

        // Yearly stats
        const { data: yearData } = await supabase
            .from('platform_stats_yearly')
            .select('*')
            .eq('platform_id', selectedPlatformId)
            .gte('year', new Date(new Date().getFullYear(), 0, 1).toISOString())
            .maybeSingle();

        const yearAmount = yearData ? yearData.total_amount : 0;
        animateValue('year-amount', 0, yearAmount, 1000, true);

    } else {
        // Show all platforms (default)
        const { data, error } = await supabase
            .from('daily_totals')
            .select('*')
            .eq('sale_day', today)
            .maybeSingle();

        if (error) console.error('Error:', error);

        const count = data ? data.total_sales : 0;
        const amount = data ? data.total_amount : 0;

        // Notifications only for all platforms view
        if (!isFirstLoad && count > lastSalesCount) {
            const newSales = count - lastSalesCount;
            console.log(`🎉 ${newSales} nuova/e vendita/e!`);
            
            if (CONFIG.notificationSound) {
                playCashSound();
            }
            
            if (CONFIG.enablePushNotifications) {
                showNotification(
                    `💰 ${newSales} Nuova Vendita!`,
                    `Hai ricevuto ${newSales} nuova/e vendita/e. Totale oggi: €${amount.toFixed(2)}`
                );
            }
        }
        
        lastSalesCount = count;
        isFirstLoad = false;

        animateValue('today-count', 0, count, 1000);
        animateValue('today-amount', 0, amount, 1000, true);

        // Monthly
        const { data: monthData } = await supabase
            .from('monthly_totals')
            .select('*')
            .order('month', { ascending: false })
            .limit(1)
            .maybeSingle();

        const monthAmount = monthData ? monthData.total_amount : 0;
        animateValue('month-amount', 0, monthAmount, 1000, true);

        // Yearly
        const { data: yearData } = await supabase
            .from('yearly_totals')
            .select('*')
            .order('year', { ascending: false })
            .limit(1)
            .maybeSingle();

        const yearAmount = yearData ? yearData.total_amount : 0;
        animateValue('year-amount', 0, yearAmount, 1000, true);
    }
}

// Add platform filter setup function:
async function setupPlatformFilter() {
    const filterContainer = document.querySelector('.page-title');
    if (!filterContainer) return;

    const filterHTML = `
        <div style="margin-top: 1rem;">
            <select id="dashboard-platform-filter" style="padding: 0.6rem 1rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); font-size: 0.9rem; cursor: pointer;">
                <option value="">📊 Tutte le Piattaforme</option>
            </select>
        </div>
    `;
    filterContainer.insertAdjacentHTML('beforeend', filterHTML);

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

// Call setupPlatformFilter() in DOMContentLoaded after loadDashboardData()
