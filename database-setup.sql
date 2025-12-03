-- STL Sales Tracker Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. PLATFORMS TABLE (Piattaforme di vendita)
-- ============================================
CREATE TABLE IF NOT EXISTS platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    email_pattern TEXT, -- Pattern per identificare email da questa piattaforma
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. EMAIL ACCOUNTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL, -- 'gmail' o 'yahoo'
    imap_host VARCHAR(255),
    imap_port INTEGER DEFAULT 993,
    active BOOLEAN DEFAULT true,
    last_checked TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. SALES TABLE (Vendite)
-- ============================================
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id UUID REFERENCES platforms(id) ON DELETE CASCADE,
    email_account_id UUID REFERENCES email_accounts(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'EUR',
    sale_date TIMESTAMP WITH TIME ZONE NOT NULL,
    email_subject TEXT,
    email_body TEXT,
    raw_email_data JSONB, -- Dati completi email per debug
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. INDEXES per performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sales_platform ON sales(platform_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platforms_active ON platforms(active);
CREATE INDEX IF NOT EXISTS idx_email_accounts_active ON email_accounts(active);

-- ============================================
-- 5. VIEWS per Analytics
-- ============================================

-- Vista vendite giornaliere per piattaforma
CREATE OR REPLACE VIEW daily_sales_by_platform AS
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

-- Vista totali giornalieri
CREATE OR REPLACE VIEW daily_totals AS
SELECT 
    DATE(sale_date) as sale_day,
    COUNT(*) as total_sales,
    SUM(amount) as total_amount,
    currency
FROM sales
GROUP BY DATE(sale_date), currency
ORDER BY sale_day DESC;

-- Vista totali mensili
CREATE OR REPLACE VIEW monthly_totals AS
SELECT 
    DATE_TRUNC('month', sale_date) as month,
    COUNT(*) as total_sales,
    SUM(amount) as total_amount,
    currency
FROM sales
GROUP BY DATE_TRUNC('month', sale_date), currency
ORDER BY month DESC;

-- Vista totali annuali
CREATE OR REPLACE VIEW yearly_totals AS
SELECT 
    DATE_TRUNC('year', sale_date) as year,
    COUNT(*) as total_sales,
    SUM(amount) as total_amount,
    currency
FROM sales
GROUP BY DATE_TRUNC('year', sale_date), currency
ORDER BY year DESC;

-- ============================================
-- 6. FUNCTIONS
-- ============================================

-- Funzione per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per platforms
CREATE TRIGGER update_platforms_updated_at
    BEFORE UPDATE ON platforms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger per email_accounts
CREATE TRIGGER update_email_accounts_updated_at
    BEFORE UPDATE ON email_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Abilita RLS sulle tabelle
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Policy: Tutti possono leggere (per ora - puoi restringere dopo)
CREATE POLICY "Enable read access for all users" ON platforms
    FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON email_accounts
    FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON sales
    FOR SELECT USING (true);

-- Policy: Tutti possono inserire (per ora - puoi restringere dopo)
CREATE POLICY "Enable insert for all users" ON platforms
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable insert for all users" ON email_accounts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable insert for all users" ON sales
    FOR INSERT WITH CHECK (true);

-- Policy: Tutti possono aggiornare (per ora - puoi restringere dopo)
CREATE POLICY "Enable update for all users" ON platforms
    FOR UPDATE USING (true);

CREATE POLICY "Enable update for all users" ON email_accounts
    FOR UPDATE USING (true);

-- Policy: Tutti possono cancellare (per ora - puoi restringere dopo)
CREATE POLICY "Enable delete for all users" ON platforms
    FOR DELETE USING (true);

CREATE POLICY "Enable delete for all users" ON email_accounts
    FOR DELETE USING (true);

CREATE POLICY "Enable delete for all users" ON sales
    FOR DELETE USING (true);

-- ============================================
-- 8. DATI INIZIALI (Seed Data)
-- ============================================

-- Inserisci le 4 piattaforme iniziali
INSERT INTO platforms (name, email_pattern, active) VALUES
    ('Cults3D', 'cults3d.com', true),
    ('CGTrader', 'cgtrader.com', true),
    ('3DExport', '3dexport.com', true),
    ('Pixup', 'pixup3d.com', true)
ON CONFLICT (name) DO NOTHING;

-- Inserisci gli account email (NOTA: dovrai aggiungere le credenziali in modo sicuro)
-- Per ora inserisco solo gli indirizzi, le credenziali le gestirai in modo sicuro
INSERT INTO email_accounts (email, provider, imap_host, imap_port, active) VALUES
    ('your-gmail-1@gmail.com', 'gmail', 'imap.gmail.com', 993, true),
    ('your-gmail-2@gmail.com', 'gmail', 'imap.gmail.com', 993, true),
    ('your-gmail-3@gmail.com', 'gmail', 'imap.gmail.com', 993, true),
    ('your-yahoo@yahoo.com', 'yahoo', 'imap.mail.yahoo.com', 993, true)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- COMPLETATO! ✅
-- ============================================
-- Ora puoi:
-- 1. Eseguire query sulle views per analytics
-- 2. Inserire vendite manualmente o via Edge Functions
-- 3. Gestire piattaforme e account email
