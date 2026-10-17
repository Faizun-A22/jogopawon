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

