@echo off
title JogoPawon - Push Otomatis ke GitHub
echo ==========================================================
echo   🥬 JogoPawon Mart - Safe Auto Push to GitHub
echo ==========================================================
echo.

set /p MSG="Masukkan catatan perubahan (kosongkan untuk default): "
if "%MSG%"=="" set MSG=update: sinkronisasi sistem terbaru (%date% %time%)

git add .
git commit -m "%MSG%"
git push origin main

echo.
echo ==========================================================
echo   ✅ Selesai! Kode berhasil diunggah ke GitHub.
echo   👉 Di VPS Anda, cukup jalankan: bash update-vps.sh
echo ==========================================================
echo.
pause
