# 🥬 JogoPawon Mart — Sistem Pre-Order (PO) & Dagang Sayur Segar Modern

Aplikasi jual beli sayur segar berbasis **Pre-Order (PO) Panen Subuh** dengan tampilan Shopee-style, backend super cepat Golang dengan **Real-Time WebSocket**, skema PostgreSQL (Supabase), serta dashboard admin lengkap untuk mengelola seluruh rantai dagang sayur (pembelian pasar induk/petani, timbang & packing, kurir, keuangan, dan pencatatan sayur rusak/afkir).

---

## 🌟 Fitur Baru: Sistem Pre-Order (PO) & Simulasi Dagang

### 1. 🕒 Sistem Pre-Order (PO) Panen Subuh
- **Konsep Bisnis**:
  - Pelanggan memesan sayur hari ini sebelum **Cut-Off Pukul 21:00 WIB**.
  - Sayur dipetik/dipanen di kebun (Lembang/Ciwidey) atau dibeli di Pasar Induk pukul **03:00 Subuh**.
  - Tim gudang menimbang dan mengemas ke dalam cool-box pukul **05:00 Subuh**.
  - Kurir mengantar langsung ke rumah pelanggan pukul **06:00 - 08:00 Pagi** (sebelum waktu memasak sarapan).
- **Indikator & Countdown Cut-Off**:
  - Banner hitungan mundur waktu sisa pemesanan PO malam hari.
  - Pilihan tanggal PO di keranjang: **Besok Subuh** atau **Lusa Subuh**.

### 2. 🎮 Fitur Simulasi Interaktif Siklus Lengkap (1-Click Simulation)
- Anda dapat menekan tombol **"Simulasi PO"** (tersedia di banner atas toko, footer, atau dashboard admin).
- Menampilkan simulasi 6 tahapan real-time:
  1. *Pembeli Melakukan Pre-Order (PO)* (Pukul 19:30 WIB)
  2. *Cut-Off PO Ditutup & Dikonfirmasi Toko* (Pukul 21:00 WIB)
  3. *Panen & Belanja Pasar Induk (Procurement)* (Pukul 03:00 Subuh)
  4. *Timbang, Sortir & Packing Gudang* (Pukul 05:00 Subuh)
  5. *Kurir Subuh Berangkat Mengantar* (Pukul 06:15 Pagi)
  6. *Sayur Tiba di Rumah Pelanggan & Selesai* (Pukul 07:00 Pagi)
- Dilengkapi tombol **Auto-Play** dan sinkronisasi live data langsung ke admin dashboard & layar lacak pelanggan.

### 3. 📊 Dashboard Admin & Operasional Dagang (Full ERP)
- **🌱 Rekap Belanja Subuh (*Procurement Sheet*)**:
  - Menjumlahkan secara otomatis total kilogram/ikat dari semua PO masuk untuk dibawa belanja ke pasar induk atau order ke petani.
  - Tombol sekali klik **Cetak Lembar Belanja Subuh** untuk tim kulakan.
- **💰 Keuangan & Laba Dagang**:
  - Menghitung **Total Omzet**, **Total HPP (Modal Kulakan)**, **Laba Kotor**, **Kerugian Sayur Rusak**, dan **Laba Bersih Operasional (%)**.
- **⚠️ Manajemen Sayur Rusak / Afkir (*Waste Log*)**:
  - Pencatatan sayur yang layu atau membusuk saat proses sortir gudang beserta kalkulasi nominal kerugiannya.
- **🛵 Manajemen Kurir Subuh**:
  - Pembagian pesanan ke armada motor box pendingin (*Kang Asep*, *Mas Rian*, dll).

### 4. 🔍 Radar Harga & Scraper Engine (Petani, Medsos & Pasar Induk)
- **Pencarian Harga Termurah Absolut**:
  - Memindai penawaran komoditas langsung dari kebun petani (Ciwidey, Lembang, Brebes, Nganjuk, Blitar), postingan grup Facebook, video TikTok panen langsung, Instagram, dan pasar induk (Caringin & Kramat Jati).
- **Komparasi Otomatis dengan Modal Kulakan JogoPawon (HPP)**:
  - Menghitung nilai rupiah & persentase **Hemat Modal (%)** dan **Proyeksi Margin Baru (%)**.
  - Penanda cerdas: `BEST DEAL` (hemat >25%), `LEBIH MURAH`, `SETARA`, hingga peringatan `WASPADA PENIPUAN (SCAM DP)`.
- **Aksi Cepat 1-Klik**:
  - 🟢 **Chat WhatsApp Petani**: Langsung membuka pesan WhatsApp dengan draf penawaran resmi PO JogoPawon.
  - ⚡ **Terapkan HPP Baru**: Mengupdate modal HPP produk di JogoPawon dengan satu klik.
  - 📥 **Ekspor CSV / Excel**: Unduh rekap harga kulakan termurah untuk tim lapangan.
- **Standalone Python Engine & Menu Interaktif**:
  - Disediakan modul Python mandiri di folder `scraper/` dan menu klik ganda `run_scraper.bat`.

---

## 🚀 Menjalankan Aplikasi

Aplikasi saat ini **sudah aktif berjalan di komputer Anda**:
- **Website Toko & Admin**: [http://localhost:5173](http://localhost:5173)
- **Backend API & WebSocket**: [http://localhost:8080](http://localhost:8080)

Untuk menjalankan ulang di kemudian hari:
Cukup klik ganda file:
```
start-all.bat
```
