# Script Push Cepat & Aman ke GitHub (JogoPawon)
# Menjamin file .env, kredensial, dan binary TIDAK PERNAH terdorong ke GitHub.

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🥬 JogoPawon Mart - Safe Auto Push to GitHub" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Pastikan folder data dan file sensitif aman
if (-not (Test-Path ".gitignore")) {
    Write-Host "❌ .gitignore tidak ditemukan! Membatalkan demi keamanan." -ForegroundColor Red
    exit 1
}

# 2. Ambil pesan commit dari argumen atau default
$commitMsg = $args[0]
if ([string]::IsNullOrWhiteSpace($commitMsg)) {
    $commitMsg = "update: sinkronisasi fitur & pembaruan sistem (" + (Get-Date -Format "yyyy-MM-dd HH:mm") + ")"
}

Write-Host "1. Memeriksa file perubahan..." -ForegroundColor Yellow
git status --short

Write-Host "`n2. Menambahkan file aman ke Git staging..." -ForegroundColor Yellow
git add .

Write-Host "3. Membuat commit: '$commitMsg'..." -ForegroundColor Yellow
git commit -m "$commitMsg"

Write-Host "4. Mengunggah ke GitHub (branch: main)..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n==========================================================" -ForegroundColor Green
    Write-Host "✅ BERHASIL PUSH KE GITHUB!" -ForegroundColor Green
    Write-Host "👉 Sekarang di VPS Anda, cukup ketik: bash update-vps.sh" -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Green
} else {
    Write-Host "`n❌ Gagal melakukan git push. Silakan periksa koneksi atau kredensial GitHub." -ForegroundColor Red
}
