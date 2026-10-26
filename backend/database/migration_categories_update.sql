-- ==============================================================================
-- JOGOPAWON - MIGRATION UPDATE KATEGORI PRODUK
-- ==============================================================================
-- Script ini aman dijalankan berulang kali (idempotent).
-- Bisa langsung di-copy dan di-run di Supabase SQL Editor / pgAdmin / DBeaver.
-- ==============================================================================

-- 1. Buat Tabel Categories (jika belum ada)
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Sinkronisasi Data 8 Kategori Lengkap JogoPawon
INSERT INTO categories (id, name, icon, slug, description, display_order, updated_at) VALUES
('cat_sembako', 'Sembako', 'Layers', 'sembako', 'Beras pulen, minyak goreng, gula pasir, tepung terigu, dan kebutuhan pokok.', 1, NOW()),
('cat_sayur', 'Sayuran Segar', 'Leaf', 'sayuran-segar', 'Sayuran hijau petik subuh, umbi segar, dedaunan, dan sayur sop.', 2, NOW()),
('cat_buah', 'Buah-buahan Segar', 'Apple', 'buah-buahan', 'Aneka buah segar pilihan manis, kaya vitamin untuk keluarga.', 3, NOW()),
('cat_lauk', 'Daging & Lauk Segar', 'Soup', 'daging-lauk', 'Daging sapi, ayam potong segar, ikan segar, tahu, dan tempe.', 4, NOW()),
('cat_frozen', 'Frozen Food & Olahan', 'Package', 'frozen-food', 'Sosis, nugget, bakso, kentang beku, dan aneka makanan olahan praktis.', 5, NOW()),
('cat_bumbu', 'Bumbu Pawon', 'Flame', 'bumbu-pawon', 'Bawang merah, bawang putih, cabai, jahe, dan aneka rempah dapur.', 6, NOW()),
('cat_rumah', 'Kebutuhan Rumah', 'Layers', 'rumah-tangga', 'Sabun cuci piring, deterjen, pasta gigi, dan keperluan sanitasi rumah.', 7, NOW()),
('cat_minuman', 'Minuman & Camilan', 'Coffee', 'minuman-snack', 'Kopi, teh celup, susu, biskuit, dan camilan keluarga.', 8, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- 3. Auto-Migrasi Produk Buah ke Kategori 'cat_buah'
UPDATE products 
SET category_id = 'cat_buah',
    updated_at = NOW()
WHERE (category_id = 'cat_sayur' OR category_id IS NULL OR category_id = '')
  AND (
    LOWER(name) LIKE '%pisang%' OR 
    LOWER(name) LIKE '%jeruk%' OR 
    LOWER(name) LIKE '%apel%' OR
    LOWER(name) LIKE '%semangka%' OR 
    LOWER(name) LIKE '%melon%' OR 
    LOWER(name) LIKE '%pepaya%' OR
    LOWER(name) LIKE '%buah%' OR 
    LOWER(name) LIKE '%mangga%' OR 
    LOWER(name) LIKE '%alpukat%' OR
    LOWER(name) LIKE '%naga%' OR 
    LOWER(name) LIKE '%salak%' OR 
    LOWER(name) LIKE '%pir%' OR
    LOWER(name) LIKE '%anggur%' OR
    LOWER(name) LIKE '%strawberry%'
  );

-- 4. Auto-Migrasi Produk Frozen Food & Sosis ke Kategori 'cat_frozen'
UPDATE products 
SET category_id = 'cat_frozen',
    updated_at = NOW()
WHERE (category_id = 'cat_lauk' OR category_id = 'cat_sayur' OR category_id IS NULL OR category_id = '')
  AND (
    LOWER(name) LIKE '%sosis%' OR 
    LOWER(name) LIKE '%nugget%' OR 
    LOWER(name) LIKE '%bakso%' OR
    LOWER(name) LIKE '%frozen%' OR 
    LOWER(name) LIKE '%tempura%' OR 
    LOWER(name) LIKE '%dimsum%' OR
    LOWER(name) LIKE '%siomay%' OR 
    LOWER(name) LIKE '%kornet%' OR 
    LOWER(name) LIKE '%rolade%' OR
    LOWER(name) LIKE '%scallop%' OR
    LOWER(name) LIKE '%otak-otak%' OR
    LOWER(name) LIKE '%french fries%'
  );

-- 5. Cek Hasil Kategori yang Tersimpan di Database
SELECT id, name, icon, slug, display_order, updated_at 
FROM categories 
ORDER BY display_order ASC;
