-- STL Sales Tracker - COMPLETE SETUP & SEED
-- Run this entire script in Supabase SQL Editor to fix the "relation does not exist" error.

-- ============================================
-- 1. CLEANUP (Optional - removes old tables if they exist to start fresh)
-- ============================================
DROP VIEW IF EXISTS daily_sales_by_platform;
DROP VIEW IF EXISTS daily_totals;
DROP VIEW IF EXISTS monthly_totals;
DROP VIEW IF EXISTS yearly_totals;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS email_accounts;
DROP TABLE IF EXISTS platforms;

-- ============================================
-- 2. CREATE TABLES
-- ============================================

-- Platforms Table
CREATE TABLE platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    email_pattern TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Accounts Table
CREATE TABLE email_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL,
    imap_host VARCHAR(255),
    imap_port INTEGER DEFAULT 993,
    active BOOLEAN DEFAULT true,
    last_checked TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales Table
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id UUID REFERENCES platforms(id) ON DELETE CASCADE,
    email_account_id UUID REFERENCES email_accounts(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'EUR',
    sale_date TIMESTAMP WITH TIME ZONE NOT NULL,
    email_subject TEXT,
    email_body TEXT,
    raw_email_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. CREATE VIEWS (For Analytics)
-- ============================================

-- Daily Sales by Platform
CREATE VIEW daily_sales_by_platform AS
SELECT 
    DATE(sale_date) as sale_day,
    p.name as platform_name,
    COUNT(*) as total_sales,
    SUM(amount) as total_amount,
    currency
FROM sales s
JOIN platforms p ON s.platform_id = p.id
GROUP BY DATE(sale_date), p.name, currency
ORDER BY sale_day DESC, platform_name;

-- Daily Totals
CREATE VIEW daily_totals AS
SELECT 
    DATE(sale_date) as sale_day,
    COUNT(*) as total_sales,
    SUM(amount) as total_amount,
    currency
FROM sales
GROUP BY DATE(sale_date), currency
ORDER BY sale_day DESC;

-- Monthly Totals
CREATE VIEW monthly_totals AS
SELECT 
    DATE_TRUNC('month', sale_date) as month,
    COUNT(*) as total_sales,
    SUM(amount) as total_amount,
    currency
FROM sales
GROUP BY DATE_TRUNC('month', sale_date), currency
ORDER BY month DESC;

-- Yearly Totals
CREATE VIEW yearly_totals AS
SELECT 
    DATE_TRUNC('year', sale_date) as year,
    COUNT(*) as total_sales,
    SUM(amount) as total_amount,
    currency
FROM sales
GROUP BY DATE_TRUNC('year', sale_date), currency
ORDER BY year DESC;

-- ============================================
-- 4. ENABLE SECURITY (RLS)
-- ============================================
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Allow public access (for simplicity in this phase)
CREATE POLICY "Public Access Platforms" ON platforms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Emails" ON email_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Sales" ON sales FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 5. INSERT SEED DATA (Test Data)
-- ============================================

-- Insert Platforms
INSERT INTO platforms (name, active) VALUES
    ('Cults3D', true),
    ('CGTrader', true),
    ('3DExport', true),
    ('Pixup', true);

-- Insert Dummy Sales
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

    -- Today's Sales
    INSERT INTO sales (platform_id, product_name, amount, sale_date) VALUES
        (cults_id, 'Dragon Skull STL', 15.50, NOW()),
        (cgtrader_id, 'Sci-Fi Helmet Pack', 45.00, NOW() - INTERVAL '2 hours'),
        (cults_id, 'Miniature Base Set', 8.90, NOW() - INTERVAL '4 hours'),
        (pixup_id, 'Articulated Dragon', 12.00, NOW() - INTERVAL '1 hour');

    -- Past Sales
    INSERT INTO sales (platform_id, product_name, amount, sale_date) VALUES
        (export_id, 'Space Marine Armor', 25.00, NOW() - INTERVAL '1 day'),
        (cults_id, 'Fantasy Sword', 5.00, NOW() - INTERVAL '1 day'),
        (cgtrader_id, 'Robot Arm', 30.00, NOW() - INTERVAL '2 days'),
        (cgtrader_id, 'Cyberpunk City', 55.00, NOW() - INTERVAL '2 days'),
        (pixup_id, 'Cute Cat Holder', 4.50, NOW() - INTERVAL '2 days'),
        (cults_id, 'Dice Tower', 18.00, NOW() - INTERVAL '3 days'),
        (export_id, 'Car Engine Model', 40.00, NOW() - INTERVAL '4 days'),
        (cgtrader_id, 'Spaceship Fleet', 85.00, NOW() - INTERVAL '5 days');
END $$;
