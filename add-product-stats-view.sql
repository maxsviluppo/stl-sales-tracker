-- Vista per Statistiche Prodotti
-- Esegui questo script in Supabase SQL Editor

CREATE OR REPLACE VIEW product_stats AS
SELECT 
    product_name,
    COUNT(*) as total_sales_count,
    SUM(amount) as total_revenue,
    MAX(sale_date) as last_sale_date,
    MAX(currency) as currency -- Assumiamo valuta prevalente per semplicità
FROM sales
GROUP BY product_name
ORDER BY total_revenue DESC;

-- Esempio di query per vedere i top 5 prodotti:
-- SELECT * FROM product_stats LIMIT 5;
