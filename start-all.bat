@echo off
title JogoPawon - Pasar Sayur & Dapur Segar Subuh
echo ========================================================
echo   🥬 Menjalankan JogoPawon (Backend Go + Frontend React)
echo ========================================================
echo.

set "GOROOT=%~dp0go_sdk\go"
set "PATH=%~dp0go_sdk\go\bin;%PATH%"

echo 1. Memulai Backend Golang (Port 8080)...
start "JogoPawon Backend (Go Server)" cmd /k "cd /d %~dp0backend && server.exe"

timeout /t 2 /nobreak >nul

echo 2. Memulai Frontend React (Port 5173)...
start "JogoPawon Frontend (React + Vite)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================
echo   ✅ Aplikasi Berhasil Dijalankan!
echo   👉 Toko Pembeli & Admin: http://localhost:5173
echo   👉 Backend API & WebSocket: http://localhost:8080
echo ========================================================
echo.
pause
