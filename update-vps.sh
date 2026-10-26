#!/usr/bin/env bash
# ==============================================================================
# SCRIPT UPDATE OTOMATIS 1-KLIK DI VPS JOGOPAWON
# Jalankan di VPS: bash update-vps.sh
# ==============================================================================

set -e

echo "🥬 Memulai sinkronisasi kode dari GitHub..."

# 1. Pastikan branch utama adalah main
git checkout main || git checkout -B main origin/main

# 2. Ambil update terbaru dari GitHub
echo "📥 Menarik perubahan terbaru dari origin/main..."
git pull origin main

# 3. Jalankan rebuild & restart container Docker
echo "🚀 Memperbarui dan merestart aplikasi di VPS..."
bash deploy.sh

echo ""
echo "=========================================================="
echo "✅ UPDATE JOGOPAWON MART SELESAI & SUDAH LIVE!"
echo "👉 Domain Resmi (HTTPS)       : https://jogopawon.my.id"
echo "👉 Port Langsung Web (VPS)    : http://${VPS_IP:-203.175.127.254}:8086"
echo "👉 Backend API Internal       : http://127.0.0.1:8085"
echo "=========================================================="
