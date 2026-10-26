-- ==============================================================================
-- 🥬 JOGOPAWON MART - POSTGRESQL RESILIENT SCHEMA MIGRATION PATCH
-- ==============================================================================
-- Skrip ini dirancang 100% idempoten & aman dijalankan berulang kali di Supabase / PostgreSQL.
-- Menambahkan kolom baru jika tabel lama sudah ada (menghindari error "column does not exist")
-- serta membuat tabel dan indeks performa tinggi secara otomatis.
--
-- CARA MENJALANKAN:
-- 1. Buka Supabase Dashboard -> Menu SQL Editor -> Buat New Query
-- 2. Salin & Tempel seluruh isi skrip ini
-- 3. Klik tombol "Run"
-- ==============================================================================

-- 1. Penyesuaian Tabel Products (Stok Desimal / Kg Pecahan & Media)
ALTER TABLE products 
    ALTER COLUMN stock TYPE NUMERIC(10, 2) USING stock::NUMERIC(10, 2);

ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS videos TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_custom_budget BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_custom_budget NUMERIC(12, 2) DEFAULT 1000;

-- 2. Penyesuaian Tabel Reviews (Ulasan Produk & Verifikasi Pembeli)
CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(150) NOT NULL,
    user_phone VARCHAR(50) DEFAULT '',
    user_avatar TEXT DEFAULT '',
    location VARCHAR(150) DEFAULT '',
    rating INTEGER NOT NULL DEFAULT 5,
    comment TEXT NOT NULL,
    date VARCHAR(50) DEFAULT 'Baru saja',
    verified_buyer BOOLEAN DEFAULT false,
    images TEXT[] DEFAULT '{}',
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrasi kolom jika tabel reviews sudah pernah dibuat sebelumnya di skema lama:
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_phone VARCHAR(50) DEFAULT '';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS verified_buyer BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;

-- 3. Penyesuaian Tabel Users (Sistem Referral & Alamat Tambahan)
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_earnings INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS landmark TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS saved_addresses JSONB DEFAULT '[]'::jsonb;

-- 4. Penyesuaian Tabel Hadiah Sembako (Rewards & Redemptions)
CREATE TABLE IF NOT EXISTS rewards (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    points_required INTEGER NOT NULL DEFAULT 0,
    category VARCHAR(100) NOT NULL DEFAULT 'Sembako',
    image_url TEXT DEFAULT '',
    description TEXT DEFAULT '',
    stock INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reward_redemptions (
    id VARCHAR(50) PRIMARY KEY,
    claim_number VARCHAR(100) NOT NULL,
    reward_id VARCHAR(50) NOT NULL,
    reward_name VARCHAR(255) NOT NULL,
    reward_image TEXT DEFAULT '',
    reward_category VARCHAR(100) DEFAULT 'Sembako',
    reward_unit VARCHAR(100) DEFAULT '',
    points_spent INTEGER NOT NULL DEFAULT 0,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    delivery_option VARCHAR(50) DEFAULT 'antar_subuh',
    delivery_address TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'pending',
    courier_name VARCHAR(100) DEFAULT '',
    admin_notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE reward_redemptions ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50) DEFAULT '';
ALTER TABLE reward_redemptions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- 5. Indeks Performa Tinggi (Dijalankan Setelah Seluruh Kolom Dipastikan Ada)
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_phone ON reviews(user_phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_phone ON reward_redemptions(customer_phone);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status ON reward_redemptions(status);
