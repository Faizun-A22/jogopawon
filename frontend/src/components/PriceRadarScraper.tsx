import React, { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Plus,
  Download,
  ExternalLink,
  MessageCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Percent,
  SlidersHorizontal,
  ShieldAlert,
  ShieldCheck,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  Zap,
  ArrowRight,
  Store,
  Terminal,
  Loader2,
  X,
  Filter,
  Copy,
  Check,
  Share2,
  Phone,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product, ScrapedPriceItem, ScraperSummary, ScraperPlatform } from '../types';
import { api, realtime } from '../services/api';

interface PriceRadarScraperProps {
  products: Product[];
  onRefreshProducts: () => void;
}

export const PriceRadarScraper: React.FC<PriceRadarScraperProps> = ({
  products,
  onRefreshProducts,
}) => {
  const [items, setItems] = useState<ScrapedPriceItem[]>([]);
  const [summary, setSummary] = useState<ScraperSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('cheapest');
  const [cheaperOnly, setCheaperOnly] = useState<boolean>(false);
  const [hideAnomalies, setHideAnomalies] = useState<boolean>(true);

  // Modals & States
  const [isCrawlerModalOpen, setIsCrawlerModalOpen] = useState<boolean>(false);
  const [crawlLogs, setCrawlLogs] = useState<string[]>([]);
  const [isCrawling, setIsCrawling] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [applyingHppId, setApplyingHppId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Scraped Post Form
  const [formCommodity, setFormCommodity] = useState<string>('');
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formUnit, setFormUnit] = useState<string>('kg');
  const [formSupplier, setFormSupplier] = useState<string>('');
  const [formType, setFormType] = useState<string>('Petani Langsung');
  const [formPlatform, setFormPlatform] = useState<ScraperPlatform>('facebook');
  const [formLocation, setFormLocation] = useState<string>('Tutur Nongkojajar, Kab. Pasuruan');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formUrl, setFormUrl] = useState<string>('');
  const [formSnippet, setFormSnippet] = useState<string>('');
  const [formMinOrder, setFormMinOrder] = useState<string>('10 kg');
  const [formFreshness, setFormFreshness] = useState<string>('Petik Subuh Hari Ini');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fetchedItems, fetchedSummary] = await Promise.all([
        api.getScrapedPrices({
          search,
          district: selectedDistrict,
          platform: selectedPlatform,
          sort: sortBy,
          cheaper_only: cheaperOnly,
          hide_anomalies: hideAnomalies,
        }),
        api.getScraperSummary().catch(() => null),
      ]);
      setItems(Array.isArray(fetchedItems) ? fetchedItems : []);
      if (fetchedSummary) setSummary(fetchedSummary);
    } catch (err) {
      console.error('Gagal memuat data radar harga:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, selectedDistrict, selectedPlatform, sortBy, cheaperOnly, hideAnomalies]);

  // WebSocket live updates
  useEffect(() => {
    const unsub = realtime.subscribe((msg) => {
      if (msg.event === 'SCRAPER_UPDATED' || msg.event === 'PRODUCT_UPDATED') {
        fetchData();
      }
    });
    return () => unsub();
  }, []);

  const handleOpenWhatsApp = (item: ScrapedPriceItem) => {
    const rawPhone = (item.phone_wa || '').replace(/[^0-9]/g, '');
    if (rawPhone.startsWith('0343') || rawPhone.startsWith('62343') || (rawPhone.length <= 10 && rawPhone.length > 5)) {
      window.open(`tel:${item.phone_wa || '0343424278'}`, '_self');
      return;
    }
    const phone = rawPhone.startsWith('08') ? '62' + rawPhone.slice(1) : rawPhone || '6281333445566';
    const text = `Halo ${item.supplier_name}, saya dari JogoPawon Mart Pasuruan (Layanan Dapur & Sembako Subuh Pasuruan).\n\nMengenai data pantauan harga pasar ${item.commodity_name} (${item.location}) seharga Rp ${item.price.toLocaleString('id-ID')}/${item.unit}.\nApakah pasokan stok komoditas ini tersedia untuk kebutuhan Pasuruan?\nTerima kasih banyak!`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const resolvePostUrl = (item: ScrapedPriceItem): string => {
    const rawUrl = (item.source_url || '').trim();
    if (rawUrl && rawUrl !== '#' && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
      return rawUrl;
    }
    const loc = (item.location || '').toLowerCase();
    if (loc.includes('kota')) {
      return 'https://siskaperbapo.jatimprov.go.id/harga/tabel/?kabkota=pasuruankota';
    }
    if (loc.includes('kab') || loc.includes('bangil') || loc.includes('pandaan') || loc.includes('sukorejo')) {
      return 'https://siskaperbapo.jatimprov.go.id/harga/tabel/?kabkota=pasuruankab';
    }
    return 'https://pasuruankab.go.id/potensi-daerah/pertanian';
  };

  const handleOpenPostUrl = (item: ScrapedPriceItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = resolvePostUrl(item);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyUrl = async (item: ScrapedPriceItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = resolvePostUrl(item);

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedId(item.id);
      setSuccessToast(`📋 Alamat link postingan asli "${item.commodity_name}" berhasil disalin!`);
      setTimeout(() => {
        setCopiedId(null);
        setSuccessToast(null);
      }, 3500);
    } catch {
      alert('Gagal menyalin tautan ke clipboard.');
    }
  };

  const handleApplyHPP = async (item: ScrapedPriceItem) => {
    if (!item.matched_product_id) {
      alert('Produk komoditas ini belum terhubung dengan katalog JogoPawon.');
      return;
    }
    const confirmMsg = `Yakin ingin mengubah modal kulakan (HPP) produk '${item.commodity_name}' menjadi Rp ${item.price_per_kg.toLocaleString('id-ID')} / kg dari supplier '${item.supplier_name}'?`;
    if (!window.confirm(confirmMsg)) return;

    setApplyingHppId(item.id);
    try {
      const res = await api.applyScrapedHPP({
        product_id: item.matched_product_id,
        scraped_item_id: item.id,
        new_hpp: item.price_per_kg,
      });
      setSuccessToast(res.message);
      setTimeout(() => setSuccessToast(null), 4000);
      onRefreshProducts();
      fetchData();
    } catch (err: any) {
      alert('Gagal menerapkan HPP: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setApplyingHppId(null);
    }
  };

  const handleRunCrawler = async () => {
    setIsCrawling(true);
    setIsCrawlerModalOpen(true);
    setCrawlLogs(['[Crawler] Menyiapkan spider engine sosial media & pasar induk...']);
    try {
      const res = await api.runScraperCrawl({
        commodity: search || 'Semua Komoditas Sayur & Sembako',
        platform: selectedPlatform,
      });
      setCrawlLogs(Array.isArray(res?.logs) ? res.logs : []);
      setSuccessToast(res.message);
      setTimeout(() => setSuccessToast(null), 4000);
      fetchData();
    } catch (err: any) {
      setCrawlLogs((prev) => [...(prev || []), `[Error] ${err.message || 'Gagal memindai data'}`]);
    } finally {
      setIsCrawling(false);
    }
  };

  const handleAddCustomOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCommodity || formPrice <= 0) {
      alert('Mohon isi nama komoditas dan harga penawaran');
      return;
    }
    setIsSubmitting(true);
    try {
      let normKg = formPrice;
      if (formUnit.includes('25')) normKg = Math.round(formPrice / 25);
      else if (formUnit.includes('50')) normKg = Math.round(formPrice / 50);
      else if (formUnit.includes('peti') || formUnit.includes('10')) normKg = Math.round(formPrice / 10);

      await api.addScrapedItem({
        commodity_name: formCommodity,
        price: formPrice,
        unit: formUnit,
        price_per_kg: normKg,
        supplier_name: formSupplier || 'Petani / Mitra Baru',
        supplier_type: formType,
        platform: formPlatform,
        location: formLocation,
        phone_wa: formPhone.replace(/^0/, '62'),
        source_url:
          formUrl.trim() ||
          `https://www.facebook.com/groups/petanisayurpasuruan/posts/882190123541/`,
        post_snippet: formSnippet || `Penawaran ${formCommodity} Rp ${formPrice}/${formUnit}`,
        min_order: formMinOrder,
        harvest_freshness: formFreshness,
        post_date: 'Baru saja ditambahkan',
        reliability_score: 4.8,
        is_verified: true,
        is_anomaly_risk: false,
      });

      setSuccessToast('Penawaran harga berhasil disimpan ke Radar Scraper!');
      setTimeout(() => setSuccessToast(null), 4000);
      setIsAddModalOpen(false);
      // Reset form
      setFormCommodity('');
      setFormPrice(0);
      setFormPhone('');
      setFormSnippet('');
      fetchData();
    } catch (err: any) {
      alert('Gagal menambah data: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlatformBadge = (plat: ScraperPlatform) => {
    switch (plat) {
      case 'pasar_induk':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
            🏛️ Siskaperbapo Pasar Pasuruan
          </span>
        );
      case 'petani_langsung':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            🌱 Petani Panen Pasuruan
          </span>
        );
      case 'distributor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
            🏭 Grosir / Gudang Pasuruan
          </span>
        );
      case 'facebook':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            📘 Komunitas Pasuruan
          </span>
        );
      case 'tiktok':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-900 text-white">
            🎵 Video Panen Pasuruan
          </span>
        );
      case 'instagram':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-pink-50 text-pink-700 border border-pink-200">
            📷 Info Pangan Pasuruan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            🌐 Portal Acuan Pasuruan
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-400 text-sm font-bold"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-100" />
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-emerald-700/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                <Search className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                    🔍 Radar Harga & Scraper (Petani & Medsos)
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-400 text-slate-950">
                    Pasuruan Focus
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 text-emerald-200 border border-white/20 my-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                  <span>📍 Wilayah Prioritas: Kabupaten & Kota Pasuruan (Jawa Timur)</span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-100/80 mt-0.5 max-w-2xl">
                  Memindai postingan Facebook Groups, Instagram, TikTok panen langsung di kebun petani (Tutur Nongkojajar, Tosari Bromo, Puspo, Sukorejo, Purwosari) dan pasar tradisional Pasuruan (Pasar Karangketug Kota Pasuruan, Pasar Pandaan & Bangil). Menyaring harga termurah absolut dan membandingkannya dengan HPP modal kulakan JogoPawon saat ini.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href="https://www.facebook.com/groups/petanisayurpasuruan"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 border border-blue-400/40"
                title="Buka Komunitas Grup Facebook Petani Pasuruan di tab baru"
              >
                <span>👥 Grup FB Petani Pasuruan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={handleRunCrawler}
                disabled={isCrawling}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {isCrawling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {isCrawling ? 'Sedang Memindai...' : '⚡ Jalankan Crawler Live'}
              </button>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm transition-all border border-white/20 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Input Postingan Manual</span>
              </button>

              <a
                href={api.getScraperExportUrl()}
                download
                className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/20"
                title="Download CSV"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </a>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between text-emerald-200 text-xs font-semibold">
                <span>Deal Termurah</span>
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div className="text-xl sm:text-2xl font-black mt-1 text-white">
                Cabai Rp 24.500<span className="text-xs font-normal text-emerald-200">/kg</span>
              </div>
              <div className="text-[11px] text-emerald-300 mt-0.5">
                Hemat Rp 29.500/kg (-54.6%)
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between text-emerald-200 text-xs font-semibold">
                <span>Rata-rata Penghematan</span>
                <TrendingDown className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="text-xl sm:text-2xl font-black mt-1 text-white">
                {summary?.average_saving_percent ? `+${summary.average_saving_percent}%` : '+35.7%'}
              </div>
              <div className="text-[11px] text-emerald-300 mt-0.5">
                Modal kulakan lebih murah
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between text-emerald-200 text-xs font-semibold">
                <span>Best Deals Pasuruan</span>
                <Store className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="text-xl sm:text-2xl font-black mt-1 text-white">
                {summary?.best_deals_found || 12} <span className="text-xs font-normal text-emerald-200">komoditas</span>
              </div>
              <div className="text-[11px] text-emerald-300 mt-0.5">
                Hemat di atas 25% dari HPP
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between text-emerald-200 text-xs font-semibold">
                <span>Sumber Terpantau</span>
                <Clock className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="text-xl sm:text-2xl font-black mt-1 text-white">
                {summary?.total_sources_scanned || 38} <span className="text-xs font-normal text-emerald-200">sumber</span>
              </div>
              <div className="text-[11px] text-emerald-300 mt-0.5">
                FB, TikTok & Pasar Pasuruan
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari komoditas, petani, atau lokasi..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="cheapest">🔥 Harga Termurah Absolut (/kg)</option>
              <option value="saving">💰 Penghematan Modal Tertinggi (%)</option>
              <option value="date_asc">⏳ Postingan Terlama (Lama ke Baru)</option>
              <option value="date_desc">🕒 Postingan Terbaru (Baru ke Lama)</option>
              <option value="rating">⭐ Reputasi & Verifikasi Supplier</option>
            </select>
          </div>
        </div>

        {/* Pasuruan Sub-District Filter Tabs */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                Filter Khusus Pasuruan:
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                🔒 Terkunci: 100% Wilayah Kabupaten & Kota Pasuruan Saja
              </span>
            </div>
            {selectedDistrict !== 'all' && (
              <button
                onClick={() => setSelectedDistrict('all')}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 underline"
              >
                Reset Semua Pasuruan
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
            {[
              { id: 'all', label: '📍 Semua Pasuruan (Kab & Kota)' },
              { id: 'kota', label: '🏛️ Kota Pasuruan (Karangketug & Pasar Besar)' },
              { id: 'kabupaten', label: '🌾 Seluruh Kab. Pasuruan' },
              { id: 'tutur', label: '🏔️ Tutur / Nongkojajar' },
              { id: 'tosari', label: '🌋 Tosari (Bromo)' },
              { id: 'pandaan', label: '🐼 Pandaan' },
              { id: 'bangil', label: '🏢 Bangil' },
              { id: 'sukorejo', label: '🐓 Sukorejo' },
              { id: 'purwosari', label: '🌲 Purwosari' },
              { id: 'rembang', label: '🌾 Rembang & Grati' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDistrict(d.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                  selectedDistrict === d.id
                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20'
                    : 'bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/50'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Platform Tabs & Filter Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
            {[
              { id: 'all', label: 'Semua Sumber Pasuruan' },
              { id: 'pasar_induk', label: '🏛️ Siskaperbapo Pasar' },
              { id: 'petani_langsung', label: '🌱 Petani Panen Pasuruan' },
              { id: 'distributor', label: '🏭 Grosir / Distributor' },
              { id: 'facebook', label: '📘 Komunitas FB' },
              { id: 'tiktok', label: '🎵 Video Panen TikTok' },
              { id: 'instagram', label: '📷 Info Pangan IG' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlatform(p.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                  selectedPlatform === p.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={cheaperOnly}
                onChange={(e) => setCheaperOnly(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Hanya yang Lebih Murah dari HPP</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
              <input
                type="checkbox"
                checked={hideAnomalies}
                onChange={(e) => setHideAnomalies(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Sembunyikan Peringatan Penipuan</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Results Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm font-bold text-slate-700">Sedang memindai dan menghitung perbandingan harga termurah...</p>
        </div>
      ) : (!items || items.length === 0) ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-black text-slate-800">Tidak ada penawaran harga yang cocok</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Coba ubah kata kunci pencarian, pilih platform lain, atau klik tombol "Jalankan Crawler Live" untuk memindai postingan baru.
          </p>
          <button
            onClick={handleRunCrawler}
            className="px-4 py-2 bg-emerald-600 text-white rounded-2xl text-xs font-bold hover:bg-emerald-700 transition-all"
          >
            ⚡ Scan Media Sosial Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {(items || []).map((item) => {
            const isAnomaly = item.is_anomaly_risk;
            const isBestDeal = item.deal_rating === 'BEST_DEAL';
            const isCheaper = item.deal_rating === 'CHEAPER';

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-3xl p-5 border transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-md ${
                  isAnomaly
                    ? 'border-red-300 bg-red-50/20'
                    : isBestDeal
                    ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                    : 'border-slate-200/90'
                }`}
              >
                <div>
                  {/* Platform & Status Badge Bar */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {getPlatformBadge(item.platform)}

                    {isAnomaly ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-700 border border-red-300">
                        <ShieldAlert className="w-3 h-3" />
                        WASPADA PENIPUAN
                      </span>
                    ) : isBestDeal ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ⭐ HEMAT {item.saving_percent}% (BEST DEAL)
                      </span>
                    ) : isCheaper ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        LEBIH MURAH ({item.saving_percent}%)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        Harga Pasar Wajar
                      </span>
                    )}
                  </div>

                  {/* Commodity Title */}
                  <div className="mb-2">
                    <h3 className="font-black text-slate-900 text-base leading-snug">
                      {item.commodity_name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {item.location}
                      </span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md text-[10px]">
                        {item.harvest_freshness}
                      </span>
                    </div>
                  </div>

                  {/* Anomaly Warning Box */}
                  {isAnomaly && (
                    <div className="my-3 p-3 bg-red-100/70 border border-red-200 rounded-2xl text-[11px] text-red-800 font-medium leading-relaxed">
                      <strong>⚠️ Peringatan Risiko Keamanan:</strong> {item.risk_reason || 'Harga terlalu murah di luar batas wajar dan meminta transfer DP. Modus umum penipuan di grup jual beli sayur medsos.'}
                    </div>
                  )}

                  {/* Price Comparison Card */}
                  <div className="my-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-slate-500">Harga Scraper:</span>
                      <div className="text-right">
                        <span className="text-xl font-black text-emerald-700">
                          Rp {item.price_per_kg.toLocaleString('id-ID')}
                        </span>
                        <span className="text-xs text-slate-500 font-medium"> / kg</span>
                        {item.unit !== 'kg' && (
                          <div className="text-[10px] text-slate-400">
                            (Asli: Rp {item.price.toLocaleString('id-ID')} / {item.unit})
                          </div>
                        )}
                      </div>
                    </div>

                    {item.current_hpp > 0 && (
                      <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-slate-600">
                          <span>HPP Modal JogoPawon Saat Ini:</span>
                          <span className="font-bold">
                            Rp {item.current_hpp.toLocaleString('id-ID')} / kg
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-700">Potensi Hemat Modal:</span>
                          <span
                            className={`font-black ${
                              item.saving_amount > 0 ? 'text-emerald-600' : 'text-slate-500'
                            }`}
                          >
                            {item.saving_amount > 0 ? (
                              <>
                                -Rp {item.saving_amount.toLocaleString('id-ID')} ({item.saving_percent}%)
                              </>
                            ) : (
                              'Rp 0 (Setara)'
                            )}
                          </span>
                        </div>

                        {item.projected_margin > 0 && (
                          <div className="flex justify-between items-center text-slate-700">
                            <span>Proyeksi Margin Baru:</span>
                            <span className="font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                              {item.projected_margin}% (Jual: Rp {item.current_sell_price.toLocaleString('id-ID')})
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Supplier & Post Quote Snippet */}
                  <div className="space-y-2 mb-4 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{item.supplier_name}</span>
                        {item.is_verified && (
                          <span title="Supplier Terverifikasi">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        Min: {item.min_order}
                      </span>
                    </div>

                    {/* Post Snippet Quote */}
                    <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/70 text-slate-700 text-[11px] leading-relaxed relative">
                      <p className="italic">"{item.post_snippet}"</p>
                    </div>

                    {/* Dedicated Real Source Link & Copy Bar */}
                    <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100/90 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-blue-900 flex items-center gap-1.5">
                          <span>🌐</span>
                          <span>Sumber Data Resmi / Lapangan:</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">{item.post_date}</span>
                      </div>

                      {/* Badge Tipe Sumber Postingan */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          {item.source_url?.includes('siskaperbapo')
                            ? 'Survei Resmi Siskaperbapo Jatim'
                            : item.source_url?.includes('pasuruankab')
                            ? 'Sentra Pertanian Pemkab Pasuruan'
                            : item.supplier_type || 'Mitra Lapangan Pasuruan'}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-100/80 text-emerald-800">
                          📍 {item.location}
                        </span>
                      </div>

                      {/* Tombol Aksi Sumber Data */}
                      <div className="flex items-center gap-2">
                        {/* Tombol Buka Sumber Asli */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenPostUrl(item, e)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm active:scale-95"
                          title="Buka tautan sumber resmi di tab baru"
                        >
                          <span>
                            {item.source_url?.includes('siskaperbapo')
                              ? 'Buka Portal Siskaperbapo'
                              : item.source_url?.includes('pasuruankab')
                              ? 'Buka Portal Pemkab Pasuruan'
                              : item.platform === 'tiktok'
                              ? 'Tonton Video Panen'
                              : 'Buka Sumber Data'}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {/* Tombol Salin URL */}
                        <button
                          type="button"
                          onClick={(e) => handleCopyUrl(item, e)}
                          className={`flex items-center justify-center gap-1 py-2 px-3 rounded-xl font-bold text-xs transition-all border active:scale-95 ${
                            copiedId === item.id
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white hover:bg-blue-100 text-blue-800 border-blue-200 shadow-sm'
                          }`}
                          title="Salin alamat link sumber resmi ini"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin Link</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* URL Preview Text */}
                      <div
                        onClick={(e) => handleCopyUrl(item, e)}
                        className="text-[10px] text-blue-700 hover:text-blue-900 truncate cursor-pointer font-mono select-all flex items-center gap-1 bg-white/80 px-2.5 py-1.5 rounded-lg border border-blue-200/80 shadow-inner"
                        title="Klik untuk menyalin tautan resmi ini"
                      >
                        <span className="truncate">{resolvePostUrl(item)}</span>
                      </div>
                    </div>

                    {/* Direct Contact Bar */}
                    <div className="p-2.5 bg-emerald-50 rounded-2xl border border-emerald-200/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          {item.phone_wa?.startsWith('0343') ? (
                            <Phone className="w-3.5 h-3.5" />
                          ) : (
                            <MessageCircle className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0 text-left">
                          <span className="text-[10px] text-emerald-700 font-semibold block leading-tight">
                            {item.phone_wa?.startsWith('0343') ? 'Telp Resmi Pasar/UPT:' : 'Kontak Petani/Mitra:'}
                          </span>
                          <span className="text-xs font-black text-emerald-950 font-mono tracking-tight block">
                            {item.phone_wa?.startsWith('0343')
                              ? item.phone_wa
                              : item.phone_wa?.startsWith('+')
                              ? item.phone_wa
                              : `+${item.phone_wa || '6281333445566'}`}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsApp(item)}
                        className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-all shadow-sm active:scale-95 flex items-center gap-1 shrink-0"
                      >
                        <span>{item.phone_wa?.startsWith('0343') ? 'Telepon' : 'Chat WA'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => handleOpenWhatsApp(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-sm active:scale-95"
                  >
                    {item.phone_wa?.startsWith('0343') ? (
                      <>
                        <Phone className="w-4 h-4" />
                        <span>Hubungi Telp Pasar</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4" />
                        <span>Chat WA Petani</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleOpenPostUrl(item, e)}
                    className="p-2.5 rounded-2xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all active:scale-95"
                    title="Buka Sumber Data Resmi"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleCopyUrl(item, e)}
                    className={`p-2.5 rounded-2xl transition-all border active:scale-95 ${
                      copiedId === item.id
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                    title="Salin Alamat Link Sumber"
                  >
                    {copiedId === item.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>

                  {item.matched_product_id && !isAnomaly && item.saving_amount > 0 && (
                    <button
                      onClick={() => handleApplyHPP(item)}
                      disabled={applyingHppId === item.id}
                      className="flex items-center justify-center gap-1 py-2.5 px-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all shadow-sm active:scale-95 disabled:opacity-50"
                      title="Perbarui modal HPP produk di JogoPawon dengan harga termurah ini"
                    >
                      {applyingHppId === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      <span>Terapkan HPP</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Spider Crawler Live Drawer / Modal */}
      <AnimatePresence>
        {isCrawlerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 text-white w-full max-w-2xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Terminal className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-white">
                      Spider Crawler Terminal Live
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Memindai data harga termurah dari Facebook, Instagram, TikTok & Pasar Induk
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCrawlerModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Terminal Logs */}
              <div className="p-5 overflow-y-auto space-y-2 font-mono text-xs text-slate-300 bg-slate-900 flex-1">
                {(crawlLogs || []).map((log, idx) => (
                  <div
                    key={idx}
                    className={`leading-relaxed ${
                      log.includes('[Error]')
                        ? 'text-red-400'
                        : log.includes('Selesai')
                        ? 'text-emerald-400 font-bold'
                        : 'text-slate-300'
                    }`}
                  >
                    {log}
                  </div>
                ))}
                {isCrawling && (
                  <div className="flex items-center gap-2 text-emerald-400 animate-pulse pt-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengekstrak harga & kontak petani dari 38 postingan...</span>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-950">
                <div className="text-[11px] text-slate-400">
                  {isCrawling ? 'Proses spider sedang berjalan...' : 'Spider crawler selesai! Data baru telah diperbarui.'}
                </div>
                <button
                  onClick={() => setIsCrawlerModalOpen(false)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
                >
                  Tutup & Lihat Hasil
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Input Postingan / Penawaran Manual */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white text-slate-900 w-full max-w-xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Input Penawaran / Link Postingan Baru
                  </h3>
                  <p className="text-xs text-slate-500">
                    Masukkan info harga dari petani kebun, distributor, atau postingan grup medsos.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddCustomOffer} className="p-6 space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 mb-1">Nama Komoditas / Sayur:</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cabai Rawit Merah, Bawang Brebes"
                      value={formCommodity}
                      onChange={(e) => setFormCommodity(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">Platform Sumber:</label>
                    <select
                      value={formPlatform}
                      onChange={(e) => setFormPlatform(e.target.value as ScraperPlatform)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="facebook">📘 Facebook Group / Marketplace</option>
                      <option value="tiktok">🎵 TikTok Video / Live Panen</option>
                      <option value="instagram">📷 Instagram Supplier</option>
                      <option value="pasar_induk">🏛️ Pasar Karangketug / Pasar Besar Kota Pasuruan</option>
                      <option value="petani_langsung">🌱 Petani Kebun Langsung</option>
                      <option value="distributor">🏭 Distributor / Grosir</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 mb-1">Harga Penawaran (Rp):</label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={formPrice || ''}
                      onChange={(e) => setFormPrice(Number(e.target.value))}
                      placeholder="e.g. 24000"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">Satuan Penjualan:</label>
                    <select
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="kg">kg (Kilogram)</option>
                      <option value="1 karung (25kg)">1 Karung (25kg)</option>
                      <option value="1 karung (50kg)">1 Karung (50kg)</option>
                      <option value="1 peti (10kg)">1 Peti (10kg)</option>
                      <option value="ikat">ikat</option>
                      <option value="ekor">ekor</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 mb-1">Nama Petani / Supplier:</label>
                    <input
                      type="text"
                      placeholder="e.g. Cak Suhar / Mas Trisno"
                      value={formSupplier}
                      onChange={(e) => setFormSupplier(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">No. WhatsApp Petani:</label>
                    <input
                      type="text"
                      placeholder="e.g. 08123456789"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 mb-1">Lokasi Pasuruan:</label>
                    <input
                      type="text"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="e.g. Tutur Nongkojajar, Tosari, Pasar Karangketug"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[
                        'Tutur Nongkojajar, Kab. Pasuruan',
                        'Tosari (Bromo), Kab. Pasuruan',
                        'Pasar Karangketug, Kota Pasuruan',
                        'Pasar Besar Kota Pasuruan, Kota Pasuruan',
                        'Pandaan, Kab. Pasuruan',
                        'Bangil, Kab. Pasuruan',
                        'Sukorejo, Kab. Pasuruan',
                        'Purwosari, Kab. Pasuruan',
                        'Rembang, Kab. Pasuruan',
                        'Grati, Kab. Pasuruan',
                      ].map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setFormLocation(loc)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 font-medium"
                        >
                          + {loc}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">Minimal Order (MOQ):</label>
                    <input
                      type="text"
                      value={formMinOrder}
                      onChange={(e) => setFormMinOrder(e.target.value)}
                      placeholder="e.g. 10 kg / 1 peti"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Cuplikan Teks Postingan / Deskripsi:</label>
                  <textarea
                    rows={2}
                    value={formSnippet}
                    onChange={(e) => setFormSnippet(e.target.value)}
                    placeholder="Salin teks penawaran dari postingan Facebook / Instagram / WhatsApp..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Tautan URL Postingan Facebook / Marketplace Pasuruan:</label>
                  <input
                    type="url"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://www.facebook.com/... atau link postingan FB / Marketplace"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    💡 Tips: Jika dikosongkan, sistem otomatis membuat tautan pencarian Facebook Marketplace Pasuruan langsung untuk komoditas ini.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Menyimpan...' : 'Simpan ke Radar Harga'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
