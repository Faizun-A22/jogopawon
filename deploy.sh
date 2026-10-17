#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DEPLOY JOGOPAWON MART KE VPS
# Jalankan di VPS: bash deploy.sh
# ==============================================================================

set -e

echo "🥬 Memulai Deployment JogoPawon Mart di VPS..."

# Cek Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker belum terinstall. Menginstall Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

# Cek Docker Compose
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose v2 belum terpasang. Menginstall docker-compose-plugin..."
    apt-get update && apt-get install -y docker-compose-plugin
fi

echo "🚀 Menjalankan build & restart container di port aman (8085 & 8086)..."
docker compose down || true
docker compose build --no-cache
docker compose up -d --force-recreate

echo ""
echo "=========================================================="
echo "✅ JogoPawon Mart Berhasil Dideploy di Port Bebas!"
echo "👉 Frontend Web (Toko & Admin): http://IP_VPS:8086"
echo "👉 Backend API Internal       : http://127.0.0.1:8085"
echo "=========================================================="
docker compose ps
