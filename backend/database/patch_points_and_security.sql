-- ==============================================================================
-- JOGOPAWON MART - PATCH KEAMANAN & INTEGRITAS SISTEM POIN, VOUCHER & REFERRAL
-- ==============================================================================
-- Script ini aman dijalankan berulang kali (Idempotent).
-- Eksekusi langsung di Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Tambah kolom pelacakan pemakaian Voucher di tabel reward_redemptions
ALTER TABLE reward_redemptions ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false;
ALTER TABLE reward_redemptions ADD COLUMN IF NOT EXISTS used_in_order_id VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_claim_number ON reward_redemptions(claim_number);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_is_used ON reward_redemptions(is_used);

-- 2. Proteksi Nilai Poin Pengguna (Cegah Nilai Poin Negatif)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_points_non_negative'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT chk_users_points_non_negative CHECK (points >= 0);
    END IF;
END $$;

-- 3. Pastikan kolom referral dan tracking di tabel orders lengkap
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_awarded BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS referral_points_earned INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS referral_awarded BOOLEAN DEFAULT false;

-- 4. Pastikan kolom referral di tabel users lengkap
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_earnings INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- 5. Verifikasi Integritas Data Klaim Hadiah
SELECT 
    COUNT(*) as total_claims,
    COUNT(CASE WHEN is_used = true THEN 1 END) as used_vouchers,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_claims,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_claims
FROM reward_redemptions;
