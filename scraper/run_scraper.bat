@echo off
chcp 65001 >nul
title JogoPawon - Smart Price Scraper & Radar Harga Termurah
color 0A

:menu
cls
echo ===============================================================================
echo   🌾 JOGOPAWON MART — SMART PRICE SCRAPER & RADAR HARGA PETANI TERMURAH
echo ===============================================================================
echo.
echo   Pilih opsi pemindaian harga komoditas (Facebook, Instagram, TikTok, Pasar Induk):
echo.
echo   [1] 🚀 Scan Seluruh Komoditas & Tampilkan Harga Termurah + Margin
echo   [2] 🌶️ Cari Harga Termurah Cabai Rawit (Petani Ciwidey / Lembang / Medsos)
echo   [3] 🧅 Cari Harga Termurah Bawang Merah Brebes & Bawang Putih Kating
echo   [4] 🥬 Cari Harga Sayuran Hijau (Kangkung, Bayam, Wortel)
echo   [5] 🔄 Sinkronkan Seluruh Data Hasil Scraping ke Admin Dashboard JogoPawon
echo   [6] 📊 Ekspor Rekap Harga Termurah ke File CSV / Excel
echo   [7] 🔍 Cari Berdasarkan Kata Kunci Sendiri
echo   [8] ❌ Keluar
echo.
echo ===============================================================================
set /p pilihan="Masukkan nomor pilihan [1-8]: "

if "%pilihan%"=="1" goto scan_all
if "%pilihan%"=="2" goto scan_cabai
if "%pilihan%"=="3" goto scan_bawang
if "%pilihan%"=="4" goto scan_sayur
if "%pilihan%"=="5" goto sync_all
if "%pilihan%"=="6" goto export_csv
if "%pilihan%"=="7" goto custom_search
if "%pilihan%"=="8" goto keluar

echo Pilihan tidak valid!
timeout /t 2 >nul
goto menu

:scan_all
cls
echo.
echo [1/1] Menjalankan Scraping & Komparasi Harga Seluruh Komoditas...
python price_scraper.py --filter cheapest
echo.
pause
goto menu

:scan_cabai
cls
echo.
echo [1/1] Memindai Penawaran Cabai Rawit dari Petani & Pasar Induk...
python price_scraper.py --commodity "cabai" --filter cheapest
echo.
pause
goto menu

:scan_bawang
cls
echo.
echo [1/1] Memindai Penawaran Bawang Merah & Putih...
python price_scraper.py --commodity "bawang" --filter cheapest
echo.
pause
goto menu

:scan_sayur
cls
echo.
echo [1/1] Memindai Penawaran Sayuran Hijau...
python price_scraper.py --commodity "kangkung" --filter cheapest
python price_scraper.py --commodity "wortel" --filter cheapest
echo.
pause
goto menu

:sync_all
cls
echo.
echo [1/1] Menyinkronkan Data Scraping Langsung ke API & Dashboard JogoPawon...
python price_scraper.py --sync
echo.
pause
goto menu

:export_csv
cls
echo.
echo [1/1] Mengekspor Data Harga Termurah ke File CSV (scraped_cheapest_prices.csv)...
python price_scraper.py --export-csv
echo.
pause
goto menu

:custom_search
cls
echo.
set /p keyword="Masukkan nama komoditas yang ingin dicari (contoh: tomat, telur, ayam, beras): "
echo.
echo Mencari '%keyword%' di Facebook, Instagram, TikTok, dan Pasar Induk...
python price_scraper.py --commodity "%keyword%" --filter cheapest
echo.
pause
goto menu

:keluar
exit
