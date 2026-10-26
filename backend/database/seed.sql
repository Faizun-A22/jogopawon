-- ==============================================================================
-- DATABASE SEED
-- ==============================================================================
-- Master data (kategori, slot pengiriman, kurir, dan produk) dapat diisi
-- melalui antarmuka sistem (Admin Dashboard) atau API.
-- Akun kredensial admin disimpan dalam bentuk hash SHA-256 + Salt acak.
-- ==============================================================================

INSERT INTO admin_users (username, password_hash, salt, updated_at)
VALUES (
    'admin',
    '1cd9ae869cc9f77a2f3ce0d8c330ead0d65b0337e395f2e8009ac865f37504bb',
    'jogopawon_salt_9988_subuh',
    NOW()
)
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    salt = EXCLUDED.salt,
    updated_at = NOW();

-- Seed Master Kategori JogoPawon
INSERT INTO categories (id, name, icon, slug, description, display_order)
VALUES 
    ('cat_sembako', 'Sembako', 'Layers', 'sembako', 'Beras pulen, minyak goreng, gula pasir, tepung terigu, dan kebutuhan pokok.', 1),
    ('cat_sayur', 'Sayuran Segar', 'Leaf', 'sayuran-segar', 'Sayuran hijau petik subuh, umbi segar, dedaunan, dan sayur sop.', 2),
    ('cat_buah', 'Buah-buahan Segar', 'Apple', 'buah-buahan', 'Aneka buah segar pilihan manis, kaya vitamin untuk keluarga.', 3),
    ('cat_lauk', 'Daging & Lauk Segar', 'Soup', 'daging-lauk', 'Daging sapi, ayam potong segar, ikan segar, tahu, dan tempe.', 4),
    ('cat_frozen', 'Frozen Food & Olahan', 'Package', 'frozen-food', 'Sosis, nugget, bakso, kentang beku, dan aneka makanan olahan praktis.', 5),
    ('cat_bumbu', 'Bumbu Pawon', 'Flame', 'bumbu-pawon', 'Bawang merah, bawang putih, cabai, jahe, dan aneka rempah dapur.', 6),
    ('cat_rumah', 'Kebutuhan Rumah', 'Layers', 'rumah-tangga', 'Sabun cuci piring, deterjen, pasta gigi, dan keperluan sanitasi rumah.', 7),
    ('cat_minuman', 'Minuman & Camilan', 'Coffee', 'minuman-snack', 'Kopi, teh celup, susu, biskuit, dan camilan keluarga.', 8)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

