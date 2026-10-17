# 🌾 JogoPawon Smart Price Scraper & Commodity Intelligence Engine

Engine scraping dan intelijen harga komoditas pangan, sayur segar, sembako, dan bumbu dapur untuk menemukan **harga termurah langsung dari petani, distributor, dan pasar induk**.

---

## 🚀 Fitur Utama

1. **Multi-Channel Scraping & Crawling**:
   - 📘 **Facebook**: Grup Petani Cabai, Petani Sayur Lembang & Ciwidey, Komunitas Petani Bawang Brebes, FB Marketplace Sayur.
   - 📷 **Instagram**: Akun supplier sayur grosir, buletin harga pasar induk, tagar `#hargasayur`, `#petanicabai`, `#pasarcaringin`.
   - 🎵 **TikTok**: Video live panen kebun, grosir sayur pasar induk, info harga komoditas terkini.
   - 🏛️ **Pasar Induk**: Pasar Induk Caringin Bandung, Pasar Induk Kramat Jati Jakarta.
   - 🌱 **Petani Langsung**: Kelompok Tani Ciwidey, Lembang, Brebes, Nganjuk, Kediri, Blitar.

2. **Normalisasi Harga Otomatis (Rp / Kg)**:
   - Mengkonversi berbagai satuan (karung 25kg, 50kg, peti 10kg, ikat, ons, kuintal) ke standar harga per Kg untuk perbandingan apel-ke-apel yang akurat.

3. **Komparasi Otomatis dengan JogoPawon**:
   - Menghitung **Selisih Hemat Modal (Rp & %)** terhadap HPP JogoPawon saat ini.
   - Menghitung **Proyeksi Margin Baru (%)** jika berbelanja dari supplier tersebut.
   - Menandai **Deal Rating**: `BEST_DEAL` (hemat > 25%), `CHEAPER` (hemat 5-25%), `FAIR`, `EXPENSIVE`.

4. **Deteksi Anomali & Modus Penipuan (Scam Warning)**:
   - Secara otomatis mendeteksi harga yang tidak wajar (> 70% di bawah harga pasar dengan syarat transfer DP duluan) dan memberi label peringatan risiko agar terhindar dari akun bodong di grup medsos.

5. **WhatsApp One-Click Negotiation**:
   - Membuat tautan chat WhatsApp otomatis lengkap dengan draf pesan penawaran PO resmi yang menyebutkan nama sayur, harga di postingan, dan ajakan transaksi COD/antar ke Bandung.

6. **Sinkronisasi Langsung ke Dashboard Admin**:
   - Data scraping dapat disinkronkan langsung ke backend Golang JogoPawon (`http://localhost:8080/api/scraper/add-item`) dan tampil di Admin Dashboard.

---

## 💻 Cara Menjalankan Scraper

### Cara 1: Menggunakan Menu Interaktif (Paling Mudah)
Cukup klik ganda file:
```cmd
run_scraper.bat
```
Pilih opsi 1 sampai 7 sesuai kebutuhan Anda.

### Cara 2: Menjalankan via Command Line (CLI)

1. **Cari harga termurah cabai rawit**:
   ```cmd
   python price_scraper.py --commodity "cabai" --filter cheapest
   ```

2. **Cari harga bawang merah & putih**:
   ```cmd
   python price_scraper.py --commodity "bawang" --filter cheapest
   ```

3. **Cari hanya dari platform TikTok atau Facebook**:
   ```cmd
   python price_scraper.py --platform tiktok --filter cheapest
   ```

4. **Ekspor hasil komparasi ke file CSV / Excel**:
   ```cmd
   python price_scraper.py --export-csv
   ```
   File akan tersimpan di `scraped_cheapest_prices.csv`.

5. **Sinkronkan hasil scraping ke server & Admin Dashboard JogoPawon**:
   ```cmd
   python price_scraper.py --sync
   ```

---

## 📡 API Endpoints di Backend Golang

Backend JogoPawon menyediakan endpoint REST API untuk scraper:
- `GET /api/scraper/items`: Mengambil seluruh daftar harga termurah hasil scraping dengan filter `search`, `platform`, `sort=cheapest|saving|date`.
- `GET /api/scraper/summary`: Rekap KPI total sumber terpantau, deal terbaik, dan rata-rata penghematan modal.
- `POST /api/scraper/crawl`: Menjalankan spider crawler live.
- `POST /api/scraper/apply-hpp`: Satu klik memperbarui HPP modal produk di JogoPawon ke harga termurah hasil scraper!
- `POST /api/scraper/add-item`: Menyimpan penawaran suplier atau postingan baru.
- `GET /api/scraper/export`: Download rekap CSV harga kulakan termurah.
