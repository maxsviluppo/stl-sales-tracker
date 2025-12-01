-- 1. Identifica e rimuovi i duplicati (mantiene quello con id più basso)
DELETE FROM sales a USING sales b
WHERE a.id > b.id
AND a.product_name = b.product_name
AND a.amount = b.amount
AND a.platform_id = b.platform_id
AND abs(EXTRACT(EPOCH FROM (a.sale_date - b.sale_date))) < 300; -- Entro 5 minuti

-- 2. Correggi l'orario della vendita specifica (da 23:43 a 22:43)
-- Sottrae 1 ora alle vendite registrate oggi che sembrano essere nel futuro o errate
UPDATE sales
SET sale_date = sale_date - INTERVAL '1 hour'
WHERE sale_date > NOW() - INTERVAL '1 day'
AND EXTRACT(HOUR FROM sale_date) = 23
AND EXTRACT(MINUTE FROM sale_date) = 43;
