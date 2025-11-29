-- Inserimento dati di prova per STL Sales Tracker
-- Esegui questo script nel SQL Editor di Supabase

-- 1. Assicuriamoci di avere le piattaforme (se non esistono già)
INSERT INTO platforms (name, active) VALUES
    ('Cults3D', true),
    ('CGTrader', true),
    ('3DExport', true),
    ('Pixup', true)
ON CONFLICT (name) DO NOTHING;

-- 2. Recuperiamo gli ID delle piattaforme
DO $$
DECLARE
    cults_id UUID;
    cgtrader_id UUID;
    export_id UUID;
    pixup_id UUID;
BEGIN
    SELECT id INTO cults_id FROM platforms WHERE name = 'Cults3D';
    SELECT id INTO cgtrader_id FROM platforms WHERE name = 'CGTrader';
    SELECT id INTO export_id FROM platforms WHERE name = '3DExport';
    SELECT id INTO pixup_id FROM platforms WHERE name = 'Pixup';

    -- 3. Inseriamo vendite per OGGI (per vedere i contatori muoversi)
    INSERT INTO sales (platform_id, product_name, amount, sale_date) VALUES
        (cults_id, 'Dragon Skull STL', 15.50, NOW()),
        (cgtrader_id, 'Sci-Fi Helmet Pack', 45.00, NOW() - INTERVAL '2 hours'),
        (cults_id, 'Miniature Base Set', 8.90, NOW() - INTERVAL '4 hours'),
        (pixup_id, 'Articulated Dragon', 12.00, NOW() - INTERVAL '1 hour');

    -- 4. Inseriamo vendite per la SETTIMANA SCORSA (per il grafico)
    -- Ieri
    INSERT INTO sales (platform_id, product_name, amount, sale_date) VALUES
        (export_id, 'Space Marine Armor', 25.00, NOW() - INTERVAL '1 day'),
        (cults_id, 'Fantasy Sword', 5.00, NOW() - INTERVAL '1 day');
    
    -- 2 giorni fa
    INSERT INTO sales (platform_id, product_name, amount, sale_date) VALUES
        (cgtrader_id, 'Robot Arm', 30.00, NOW() - INTERVAL '2 days'),
        (cgtrader_id, 'Cyberpunk City', 55.00, NOW() - INTERVAL '2 days'),
        (pixup_id, 'Cute Cat Holder', 4.50, NOW() - INTERVAL '2 days');

    -- 3 giorni fa
    INSERT INTO sales (platform_id, product_name, amount, sale_date) VALUES
        (cults_id, 'Dice Tower', 18.00, NOW() - INTERVAL '3 days');

    -- 4 giorni fa
    INSERT INTO sales (platform_id, product_name, amount, sale_date) VALUES
        (export_id, 'Car Engine Model', 40.00, NOW() - INTERVAL '4 days'),
        (cults_id, 'Phone Stand', 3.50, NOW() - INTERVAL '4 days');

    -- 5 giorni fa
    INSERT INTO sales (platform_id, product_name, amount, sale_date) VALUES
        (cgtrader_id, 'Spaceship Fleet', 85.00, NOW() - INTERVAL '5 days');

    -- 6 giorni fa
    INSERT INTO sales (platform_id, product_name, amount, sale_date) VALUES
        (pixup_id, 'Garden Gnome', 7.00, NOW() - INTERVAL '6 days'),
        (cults_id, 'Planter Pot', 12.00, NOW() - INTERVAL '6 days');

END $$;
