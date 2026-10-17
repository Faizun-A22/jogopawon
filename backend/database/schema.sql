-- ==============================================================================
-- 🥬 SAYURGO MART - DATABASE SCHEMA (SUPABASE / POSTGRESQL 14+)
-- ==============================================================================
-- Platform E-Commerce & Pre-Order (PO) Sayur Segar Subuh H-1
-- Fitur: Relasi Lengkap, Indeks Kecepatan, Triggers Otomatis, View ERP & Real-time
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE order_status_type AS ENUM (
        'pending',      -- Pesanan PO masuk, menunggu cut-off 21:00
        'confirmed',    -- Terkonfirmasi masuk rekap belanja subuh
        'packing',      -- Sayur dipetik subuh (03:00) & disortir/dikemas (05:00)
        'shipping',     -- Kurir berangkat mengantar (06:00 - 08:00)
        'completed',    -- Sayur diterima di meja dapur pelanggan
        'cancelled'     -- Pesanan dibatalkan
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method_type AS ENUM ('cod', 'qris', 'bank_transfer', 'e_wallet');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_type AS ENUM ('unpaid', 'paid', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 3. MASTER TABLES (KATEGORI & PRODUK)
-- ==============================================================================

-- Tabel Kategori Sayuran
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabel Produk Sayur (Katalog & Data Kulakan HPP)
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category_id VARCHAR(50) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0), -- HPP / Modal Kulakan Pasar Induk
    discount_price NUMERIC(12, 2) CHECK (discount_price IS NULL OR (discount_price >= 0 AND discount_price <= price)),
    unit VARCHAR(50) NOT NULL, -- e.g. 'ikat (250g)', '500 gram', '1 kg', 'paket komplit'
    stock INTEGER NOT NULL DEFAULT 50 CHECK (stock >= 0),
    freshness VARCHAR(100) DEFAULT 'Segar Petik Subuh',
    origin VARCHAR(150) DEFAULT 'Lembang, Bandung Barat',
    description TEXT,
    image_url TEXT NOT NULL,
    rating NUMERIC(3, 2) DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5),
    sold_count INTEGER NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
    is_flash_sale BOOLEAN NOT NULL DEFAULT false,
    is_popular BOOLEAN NOT NULL DEFAULT false,
    po_batch VARCHAR(100) DEFAULT 'Panen Subuh Besok',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabel Slot Waktu Pengantaran Pagi
CREATE TABLE IF NOT EXISTS delivery_slots (
    id VARCHAR(50) PRIMARY KEY,
    time_range VARCHAR(50) NOT NULL,
    label VARCHAR(150) NOT NULL,
    max_orders INTEGER DEFAULT 50 CHECK (max_orders > 0),
    active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER DEFAULT 0
);

-- Tabel Armada Kurir Motor/Van Pendingin
CREATE TABLE IF NOT EXISTS couriers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL UNIQUE,
    vehicle VARCHAR(100) DEFAULT 'Motor Box Pendingin',
    active_orders INTEGER DEFAULT 0 CHECK (active_orders >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- 4. TRANSAKSI & PESANAN (PRE-ORDER H-1)
-- ==============================================================================

-- Tabel Pesanan Utama
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_note TEXT,
    delivery_slot VARCHAR(100) NOT NULL,
    delivery_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 day'),
    po_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 day'), -- Tanggal Panen & Antar PO Subuh
    po_cutoff VARCHAR(50) DEFAULT '21:00 WIB',
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 10000 CHECK (delivery_fee >= 0),
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'cod',
    payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid',
    payment_proof_url TEXT,
    house_photo_url TEXT,
    total_profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    points_earned INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    courier_id VARCHAR(50) REFERENCES couriers(id) ON DELETE SET NULL ON UPDATE CASCADE,
    courier_name VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_profit NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_awarded BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS referral_points_earned INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS referral_awarded BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS house_photo_url TEXT;

-- Tabel Detail Item Pesanan (Sayur yang dibeli)
CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    product_id VARCHAR(50) REFERENCES products(id) ON DELETE SET NULL ON UPDATE CASCADE,
    product_name VARCHAR(200) NOT NULL,
    product_image TEXT,
    unit VARCHAR(50) NOT NULL,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0), -- Dicatat untuk audit HPP
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    variant_name VARCHAR(100)
);

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_name VARCHAR(100);

-- Tabel Riwayat Perubahan Status Pesanan (Audit Trail / Tracking Timeline)
CREATE TABLE IF NOT EXISTS order_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    notes TEXT,
    changed_by VARCHAR(100) DEFAULT 'System',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- 5. TESTIMONI & ULASAN PEMBELI (REVIEWS)
-- ==============================================================================

-- Tabel Testimoni & Review Produk
CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    user_name VARCHAR(150) NOT NULL,
    user_avatar TEXT,
    location VARCHAR(150) DEFAULT 'Pelanggan SayurGo',
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    date VARCHAR(50) DEFAULT 'Baru saja',
    verified_buyer BOOLEAN NOT NULL DEFAULT true,
    images TEXT[] DEFAULT '{}',
    likes INTEGER NOT NULL DEFAULT 0 CHECK (likes >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- 6. OPERASIONAL GUDANG & PENCATATAN KERUGIAN (WASTE & AFKIR)
-- ==============================================================================

-- Tabel Pencatatan Sayur Rusak / Layu (Waste Loss Management)
CREATE TABLE IF NOT EXISTS waste_records (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) REFERENCES products(id) ON DELETE SET NULL ON UPDATE CASCADE,
    product_name VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL, -- e.g. 'Daun menguning kena panas', 'Patah saat sortir'
    loss_amount NUMERIC(12, 2) NOT NULL CHECK (loss_amount >= 0), -- Total kerugian rupiah
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- 7. INDEKS UNTUK PERFORMA TINGGI (INDEXING)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_flash_sale ON products(is_flash_sale);
CREATE INDEX IF NOT EXISTS idx_products_is_popular ON products(is_popular);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_po_date ON orders(po_date);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_waste_records_date ON waste_records(date DESC);

-- ==============================================================================
-- 8. TRIGGERS OTOMATIS (BUSINESS LOGIC)
-- ==============================================================================

-- Trigger A: Otomatis perbarui updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger B: Otomatis Hitung Ulang Rating Produk saat Ada Review Baru
CREATE OR REPLACE FUNCTION recalculate_product_rating()
RETURNS TRIGGER AS $$
DECLARE
    target_prod_id VARCHAR(50);
    new_avg NUMERIC(3, 2);
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_prod_id := OLD.product_id;
    ELSE
        target_prod_id := NEW.product_id;
    END IF;

    SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 5.0)
    INTO new_avg
    FROM reviews
    WHERE product_id = target_prod_id;

    UPDATE products
    SET rating = new_avg
    WHERE id = target_prod_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalculate_rating ON reviews;
CREATE TRIGGER trg_recalculate_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION recalculate_product_rating();

-- Trigger C: Otomatis Kurangi Stok Produk saat Item Pesanan Masuk
CREATE OR REPLACE FUNCTION deduct_product_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET stock = GREATEST(0, stock - NEW.quantity),
        sold_count = sold_count + NEW.quantity
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deduct_stock ON order_items;
CREATE TRIGGER trg_deduct_stock
AFTER INSERT ON order_items
FOR EACH ROW EXECUTE FUNCTION deduct_product_stock_on_order();

-- ==============================================================================
-- 9. DATABASE VIEWS (REKAP BELANJA PASAR & LAPORAN LABA RUGI / ERP)
-- ==============================================================================

-- View 1: Rekap Belanja Pasar Induk Subuh (Procurement Sheet)
CREATE OR REPLACE VIEW view_rekap_belanja_subuh AS
SELECT 
    p.id AS product_id,
    p.name AS product_name,
    p.unit,
    COALESCE(SUM(oi.quantity), 0) AS total_dibutuhkan,
    p.cost_price AS harga_modal_satuan,
    (COALESCE(SUM(oi.quantity), 0) * p.cost_price) AS estimasi_modal_belanja,
    (COALESCE(SUM(oi.quantity), 0) * COALESCE(p.discount_price, p.price)) AS estimasi_omset_penjualan,
    ((COALESCE(SUM(oi.quantity), 0) * COALESCE(p.discount_price, p.price)) - 
     (COALESCE(SUM(oi.quantity), 0) * p.cost_price)) AS estimasi_laba_kotor
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.status IN ('pending', 'confirmed', 'packing') 
  AND o.po_date = (CURRENT_DATE + INTERVAL '1 day')
GROUP BY p.id, p.name, p.unit, p.cost_price, p.discount_price, p.price
ORDER BY total_dibutuhkan DESC;

-- View 2: Laporan Keuangan Dagang (P&L Financials)
CREATE OR REPLACE VIEW view_laporan_keuangan_pl AS
WITH order_calc AS (
    SELECT 
        COUNT(DISTINCT o.id) AS total_transaksi,
        COALESCE(SUM(o.subtotal), 0) AS total_omset,
        COALESCE(SUM(oi.cost_price * oi.quantity), 0) AS total_hpp
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.status != 'cancelled'
),
waste_calc AS (
    SELECT COALESCE(SUM(loss_amount), 0) AS total_rugi_afkir
    FROM waste_records
)
SELECT 
    oc.total_transaksi,
    oc.total_omset,
    oc.total_hpp,
    (oc.total_omset - oc.total_hpp) AS laba_kotor,
    wc.total_rugi_afkir,
    (oc.total_omset - oc.total_hpp - wc.total_rugi_afkir) AS laba_bersih,
    CASE 
        WHEN oc.total_omset > 0 THEN 
            ROUND((((oc.total_omset - oc.total_hpp - wc.total_rugi_afkir) / oc.total_omset) * 100)::numeric, 2)
        ELSE 0 
    END AS margin_keuntungan_persen
FROM order_calc oc, waste_calc wc;

-- ==============================================================================
-- 10. TABEL PELANGGAN & KONSUMEN JOGOPAWON (USERS)
-- ==============================================================================
-- Jika sebelumnya ada tabel customer_users, otomatis ubah namanya jadi users:
ALTER TABLE IF EXISTS customer_users RENAME TO users;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(150),
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(100) NOT NULL,
    address TEXT DEFAULT '',
    note TEXT,
    avatar_url TEXT,
    house_photo_url TEXT,
    points INTEGER NOT NULL DEFAULT 50, -- Bonus 50 Poin Selamat Datang!
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS house_photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS landmark TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS saved_addresses JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_earnings INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE users ALTER COLUMN address DROP NOT NULL;
ALTER TABLE users ALTER COLUMN address SET DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- View alias customer_users agar query lama tetap berfungsi jika ada
CREATE OR REPLACE VIEW customer_users AS SELECT * FROM users;

-- ==============================================================================
-- 11. TABEL AUTENTIKASI ADMIN (HASHED PASSWORD)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(100) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 12. SUPABASE REALTIME ENABLEMENT (OPSIONAL UNTUK SUPABASE)
-- ==============================================================================
-- Mengaktifkan event WebSocket real-time bawaan Supabase
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders, products, reviews, couriers, users;
EXCEPTION
    WHEN undefined_object THEN null;
    WHEN others THEN null;
END $$;

-- ==============================================================================
-- 13. TABEL RADAR HARGA SISKAPERBAPO PASURUAN (SCRAPED PRICES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS scraped_prices (
    id VARCHAR(100) PRIMARY KEY,
    commodity_name VARCHAR(200) NOT NULL,
    matched_product_id VARCHAR(50),
    category VARCHAR(100),
    price NUMERIC(12, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    price_per_kg NUMERIC(12, 2),
    supplier_name VARCHAR(200),
    supplier_type VARCHAR(100),
    platform VARCHAR(50),
    location VARCHAR(200),
    phone_wa VARCHAR(50),
    source_url TEXT,
    post_snippet TEXT,
    min_order VARCHAR(100),
    harvest_freshness VARCHAR(150),
    post_date VARCHAR(100),
    reliability_score NUMERIC(3, 2),
    is_verified BOOLEAN DEFAULT true,
    is_anomaly_risk BOOLEAN DEFAULT false,
    risk_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scraped_prices_commodity ON scraped_prices(commodity_name);
CREATE INDEX IF NOT EXISTS idx_scraped_prices_location ON scraped_prices(location);

-- ==============================================================================
-- 14. TABEL KLAIM PENUKARAN HADIAH POIN (REWARD REDEMPTIONS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS reward_redemptions (
    id VARCHAR(50) PRIMARY KEY,
    claim_number VARCHAR(50) NOT NULL UNIQUE,
    reward_id VARCHAR(50) NOT NULL,
    reward_name VARCHAR(150) NOT NULL,
    reward_image TEXT,
    reward_category VARCHAR(100),
    reward_unit VARCHAR(50),
    points_spent INTEGER NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    delivery_option VARCHAR(50) DEFAULT 'antar_subuh',
    delivery_address TEXT,
    notes TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    courier_name VARCHAR(100),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_phone ON reward_redemptions(customer_phone);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status ON reward_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_created ON reward_redemptions(created_at DESC);



