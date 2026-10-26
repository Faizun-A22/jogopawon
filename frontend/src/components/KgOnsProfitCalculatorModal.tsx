import React, { useState, useEffect } from 'react';
import { Product, ProductVariant } from '../types';
import {
  calculateKgOnsProfit,
  KgOnsProfitCalcResult,
  isKgUnit,
} from '../utils/smartPricing';
import {
  Calculator,
  X,
  Scale,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Check,
  Copy,
  Plus,
  Minus,
  Coins,
  Store,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface KgOnsProfitCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProduct?: Product | null;
  products?: Product[];
  onApplyRetailVariant?: (
    product: Product,
    variantName: string,
    retailPrice: number,
    retailCost: number,
    retailGrams: number
  ) => Promise<void> | void;
}

export const KgOnsProfitCalculatorModal: React.FC<KgOnsProfitCalculatorModalProps> = ({
  isOpen,
  onClose,
  initialProduct,
  products = [],
  onApplyRetailVariant,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProduct?.id || ''
  );
  const [kgCostPrice, setKgCostPrice] = useState<number>(10000);
  const [kgSellPrice, setKgSellPrice] = useState<number>(11000);
  const [retailGrams, setRetailGrams] = useState<number>(100); // 100g = 1 ons
  const [retailSellPrice, setRetailSellPrice] = useState<number>(1200);
  const [quantityPurchased, setQuantityPurchased] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  // Filter kilo products for product selection
  const kgProducts = products.filter((p) => isKgUnit(p.unit));

  // Sync with initial product or selected product
  useEffect(() => {
    if (initialProduct) {
      setSelectedProductId(initialProduct.id);
      populateFromProduct(initialProduct);
    } else if (kgProducts.length > 0 && !selectedProductId) {
      setSelectedProductId(kgProducts[0].id);
      populateFromProduct(kgProducts[0]);
    }
  }, [initialProduct, isOpen]);

  const populateFromProduct = (prod: Product) => {
    const cost = prod.cost_price > 0 ? prod.cost_price : 10000;
    const price = prod.price > 0 ? prod.price : cost + 1000;
    setKgCostPrice(cost);
    setKgSellPrice(price);

    // Look for existing 1 Ons (100g) variant
    const onsVariant = prod.variants?.find((v) => {
      const n = (v.name || '').toLowerCase();
      return n.includes('1 ons') || n.includes('100g') || v.weight_g === 100;
    });

    if (onsVariant) {
      setRetailSellPrice(onsVariant.price);
      setRetailGrams(onsVariant.weight_g || 100);
    } else {
      // Default: 1 ons = (cost / 10) + markup eceran wajar
      const basePerOns = Math.round(cost / 10);
      const defaultSellOns = Math.max(500, Math.ceil((basePerOns * 1.2) / 100) * 100);
      setRetailSellPrice(defaultSellOns > 0 ? defaultSellOns : 1200);
      setRetailGrams(100);
    }
  };

  const handleSelectProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    if (!prodId) return;
    const found = products.find((p) => p.id === prodId);
    if (found) {
      populateFromProduct(found);
    }
  };

  const handlePreset = (type: 'user_example' | 'cabai' | 'bawang' | 'tomat' | 'custom_unrounded') => {
    setSelectedProductId('');
    if (type === 'user_example') {
      setKgCostPrice(10000);
      setKgSellPrice(11000);
      setRetailGrams(100);
      setRetailSellPrice(1200);
      setQuantityPurchased(1);
    } else if (type === 'custom_unrounded') {
      setKgCostPrice(10000);
      setKgSellPrice(12500);
      setRetailGrams(100);
      setRetailSellPrice(3750);
      setQuantityPurchased(1);
    } else if (type === 'cabai') {
      setKgCostPrice(35000);
      setKgSellPrice(40000);
      setRetailGrams(100);
      setRetailSellPrice(4500);
      setQuantityPurchased(1);
    } else if (type === 'bawang') {
      setKgCostPrice(28000);
      setKgSellPrice(32000);
      setRetailGrams(100);
      setRetailSellPrice(3500);
      setQuantityPurchased(1);
    } else if (type === 'tomat') {
      setKgCostPrice(8000);
      setKgSellPrice(10000);
      setRetailGrams(100);
      setRetailSellPrice(1200);
      setQuantityPurchased(1);
    }
  };

  const formatRupiah = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return 'Rp ' + Math.round(num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Perform calculation
  const calcResult: KgOnsProfitCalcResult = calculateKgOnsProfit({
    kgCostPrice,
    kgSellPrice,
    retailGrams,
    retailSellPrice,
    quantityPurchased,
  });

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleApplyToVariant = async () => {
    if (!selectedProduct || !onApplyRetailVariant) return;
    try {
      const vName = calcResult.retailName;
      const vPrice = calcResult.retailSellPrice;
      const vCost = calcResult.retailCostPerPortion;
      await onApplyRetailVariant(selectedProduct, vName, vPrice, vCost, calcResult.retailGrams);
      setApplySuccess(`Varian "${vName}" seharga ${formatRupiah(vPrice)} berhasil diterapkan ke ${selectedProduct.name}!`);
      setTimeout(() => setApplySuccess(null), 4000);
    } catch (e: any) {
      alert('Gagal menerapkan varian: ' + (e.message || 'Error'));
    }
  };

  const handleCopySummary = () => {
    const text = `🧮 SIMULASI KEUNTUNGAN ECERAN (ONS KE KG) - JOGOPAWON MART
--------------------------------------------------------
Produk: ${selectedProduct ? selectedProduct.name : 'Simulasi Bebas'}
Modal Kulakan 1 Kg: ${formatRupiah(calcResult.kgCostPrice)}
Harga Jual Kiloan (1 Kg): ${formatRupiah(calcResult.kgSellPrice)} (Untung Kiloan: ${formatRupiah(calcResult.kgWholeProfit)})

📦 RINCIAN ECERAN:
- Porsi Ecer: ${calcResult.retailName} (${calcResult.portionsPerKg} porsi / kg)
- Modal per ${calcResult.retailName}: ${formatRupiah(calcResult.retailCostPerPortion)}
- Harga Jual per ${calcResult.retailName}: ${formatRupiah(calcResult.retailSellPrice)}
- Untung per ${calcResult.retailName}: ${formatRupiah(calcResult.profitPerPortion)}

💰 PROYEKSI KONVERSI JIKA 1 KG TERJUAL ECERAN:
- Total Omzet 1 Kg (10 Ons): ${formatRupiah(calcResult.totalRetailRevenuePerKg)}
- Modal Kulakan 1 Kg: ${formatRupiah(calcResult.kgCostPrice)}
- TOTAL UNTUNG PER KG: ${formatRupiah(calcResult.totalProfitPerKgIfRetailed)}
- Ekstra Cuan vs Kiloan: +${formatRupiah(calcResult.extraProfitFromRetail)} / kg (+${calcResult.profitMultiplierPercent.toFixed(0)}% lebih untung!)

🛒 Simulasi Beli ${calcResult.quantityPurchased} × ${calcResult.retailName}:
- Bayar: ${formatRupiah(calcResult.customerTotalPaid)}
- Modal Terpakai: ${formatRupiah(calcResult.merchantCostUsed)}
- Untung Masuk Kas: ${formatRupiah(calcResult.merchantProfitEarned)}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-4 sm:p-6 w-full max-w-3xl shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto border border-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight flex items-center gap-2">
                <span>Kalkulator Konversi Laba Eceran (Ons ➔ Kg)</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Fitur Baru
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Hitung berapa keuntungan jika produk kiloan (1 kg) dipecah ecer per ons atau gram.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="bg-slate-50 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Coba Simulasi Contoh Cepat:</span>
            </span>
            <span className="text-slate-400 font-normal hidden sm:inline">
              Klik salah satu tombol untuk mengisi angka otomatis
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePreset('user_example')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
              title="Sesuai contoh Anda: Modal 10rb, Jual 1 Ons 1.200 -> Untung 2.000 per kg"
            >
              <span>⭐</span>
              <span>Contoh Anda (Modal 10rb / 1 Ons 1.200 ➔ Untung 2rb/kg)</span>
            </button>
            <button
              type="button"
              onClick={() => handlePreset('custom_unrounded')}
              className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 font-extrabold text-[11px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1"
              title="Coba input nilai tidak bulat: Rp 3.750 per ons"
            >
              <span>✨</span>
              <span>Uji Nilai Bebas (Rp 3.750)</span>
            </button>
            <button
              type="button"
              onClick={() => handlePreset('cabai')}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              🌶️ Cabai Rawit (35rb/kg)
            </button>
            <button
              type="button"
              onClick={() => handlePreset('bawang')}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              🧅 Bawang Merah (28rb/kg)
            </button>
            <button
              type="button"
              onClick={() => handlePreset('tomat')}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              🍅 Tomat Segar (8rb/kg)
            </button>
          </div>
        </div>

        {/* Product Selector (Optional) */}
        {kgProducts.length > 0 && (
          <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200/70 space-y-1.5">
            <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-amber-600" />
              <span>Pilih Produk Kiloan dari Katalog Anda (Opsional):</span>
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedProductId}
                onChange={(e) => handleSelectProductChange(e.target.value)}
                className="w-full p-2 text-xs font-bold bg-white border border-amber-300 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
              >
                <option value="">-- Simulasi Angka Bebas (Manual) --</option>
                {kgProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Modal: {formatRupiah(p.cost_price || 0)} / Jual: {formatRupiah(p.price || 0)})
                  </option>
                ))}
              </select>
            </div>
            {selectedProduct && (
              <p className="text-[10px] text-amber-900/80">
                Memuat data <strong>{selectedProduct.name}</strong>. Anda dapat menguji harga eceran dan langsung menerapkannya sebagai varian timbangan.
              </p>
            )}
          </div>
        )}

        {/* Input Parameters Form Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Kolom 1: Harga Kiloan Dasar */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="font-black text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Scale className="w-3.5 h-3.5 text-emerald-600" />
              <span>1. Harga Dasar 1 Kilogram (Kg)</span>
            </h4>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Modal Kulakan HPP per 1 Kg (Rp):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={kgCostPrice || ''}
                  onChange={(e) => setKgCostPrice(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-black text-slate-900 text-xs focus:border-emerald-500 outline-none"
                  placeholder="Cth: 10000"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                <span>Format Rupiah:</span>
                <span className="font-extrabold text-slate-800">{formatRupiah(kgCostPrice || 0)}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Harga Jual Kiloan Utuh 1 Kg (Rp):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">Rp</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={kgSellPrice || ''}
                  onChange={(e) => setKgSellPrice(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-black text-emerald-900 text-xs focus:border-emerald-500 outline-none"
                  placeholder="Cth: 11000"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                <span>Format: <strong className="text-emerald-800">{formatRupiah(kgSellPrice || 0)}</strong></span>
                <span className="font-extrabold text-emerald-700">
                  Untung: {formatRupiah(calcResult.kgWholeProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* Kolom 2: Harga Eceran (Ons/Gram) */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="font-black text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Calculator className="w-3.5 h-3.5 text-teal-600" />
              <span>2. Penjualan Eceran (Ons / Gram)</span>
            </h4>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Pilih Ukuran Eceran:
              </label>
              <div className="grid grid-cols-4 gap-1.5 text-center font-bold text-[10px]">
                <button
                  type="button"
                  onClick={() => setRetailGrams(100)}
                  className={`py-1.5 px-1 rounded-xl border transition-all cursor-pointer ${
                    retailGrams === 100
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-black'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400'
                  }`}
                >
                  1 Ons (100g)
                </button>
                <button
                  type="button"
                  onClick={() => setRetailGrams(200)}
                  className={`py-1.5 px-1 rounded-xl border transition-all cursor-pointer ${
                    retailGrams === 200
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-black'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400'
                  }`}
                >
                  2 Ons (200g)
                </button>
                <button
                  type="button"
                  onClick={() => setRetailGrams(250)}
                  className={`py-1.5 px-1 rounded-xl border transition-all cursor-pointer ${
                    retailGrams === 250
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-black'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400'
                  }`}
                >
                  1/4 Kg (250g)
                </button>
                <button
                  type="button"
                  onClick={() => setRetailGrams(500)}
                  className={`py-1.5 px-1 rounded-xl border transition-all cursor-pointer ${
                    retailGrams === 500
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-black'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400'
                  }`}
                >
                  1/2 Kg (500g)
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-600">
                  Harga Jual Ecer per {calcResult.retailName} (Rp):
                </label>
                <span className="text-[10px] text-slate-400">
                  Modal per ecer: {formatRupiah(calcResult.retailCostPerPortion)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-600 font-bold">Rp</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={retailSellPrice || ''}
                  onChange={(e) => setRetailSellPrice(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-black text-teal-900 text-xs focus:border-teal-500 outline-none"
                  placeholder="Cth: 3750 atau 1200"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                <span>Format: <strong className="text-teal-900">{formatRupiah(retailSellPrice || 0)}</strong></span>
                <span className="font-extrabold text-teal-700">
                  Untung: +{formatRupiah(calcResult.profitPerPortion)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PRIMARY CALCULATION SHOWCASE (User's Formula in Action) */}
        <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-4 sm:p-5 rounded-3xl space-y-4 shadow-xl border border-emerald-800">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-emerald-800/80 pb-3">
            <span className="font-black text-xs sm:text-sm text-emerald-200 flex items-center gap-1.5 uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Hasil Kalkulasi & Konversi Laba ke 1 Kg</span>
            </span>
            <span className="text-[11px] bg-emerald-800/90 text-emerald-200 font-bold px-2.5 py-0.5 rounded-full border border-emerald-700">
              1 Kg = {calcResult.portionsPerKg} × {calcResult.retailName}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Box 1: Untung Per Porsi Eceran */}
            <div className="bg-emerald-800/50 p-3 rounded-2xl border border-emerald-700/60">
              <span className="text-[10px] font-bold text-emerald-300 block uppercase">
                Untung Langsung per {calcResult.retailName}
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-300 block mt-0.5">
                +{formatRupiah(calcResult.profitPerPortion)}
              </span>
              <span className="text-[10px] text-emerald-200/80 mt-1 block">
                Jual: {formatRupiah(calcResult.retailSellPrice)} - Modal: {formatRupiah(calcResult.retailCostPerPortion)}
              </span>
            </div>

            {/* Box 2: Total Untung jika 1 Kg terjual habis eceran */}
            <div className="bg-emerald-800/50 p-3 rounded-2xl border border-emerald-700/60 ring-2 ring-emerald-400/40">
              <span className="text-[10px] font-bold text-amber-300 block uppercase flex items-center gap-1">
                <span>⭐ Total Untung per 1 Kg</span>
              </span>
              <span className="text-xl sm:text-2xl font-black text-white block mt-0.5">
                {formatRupiah(calcResult.totalProfitPerKgIfRetailed)}
              </span>
              <span className="text-[10px] text-emerald-200/80 mt-1 block">
                {calcResult.portionsPerKg} Ons × {formatRupiah(calcResult.profitPerPortion)} = {formatRupiah(calcResult.totalProfitPerKgIfRetailed)}
              </span>
            </div>

            {/* Box 3: Tambahan Cuan vs Jual Kiloan */}
            <div className="bg-teal-800/50 p-3 rounded-2xl border border-teal-700/60">
              <span className="text-[10px] font-bold text-teal-300 block uppercase">
                Tambahan Cuan vs Kiloan
              </span>
              <span className="text-xl sm:text-2xl font-black text-teal-200 block mt-0.5">
                +{formatRupiah(calcResult.extraProfitFromRetail)}
              </span>
              <span className="text-[10px] text-teal-200/80 mt-1 block">
                {calcResult.extraProfitFromRetail >= 0
                  ? `+${calcResult.profitMultiplierPercent.toFixed(0)}% lebih untung daripada kiloan!`
                  : 'Lebih murah dari kiloan'}
              </span>
            </div>
          </div>

          {/* Interactive Simulation Stepper: Jika Pembeli Beli N Ons */}
          <div className="bg-emerald-950/80 p-3.5 rounded-2xl border border-emerald-800 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="font-bold text-emerald-200 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulasi Transaksi: Pelanggan Beli Berapa {calcResult.retailName}?</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantityPurchased(Math.max(1, quantityPurchased - 1))}
                  className="w-7 h-7 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center font-bold cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-black text-sm text-white px-2">
                  {quantityPurchased} × {calcResult.retailName}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantityPurchased(quantityPurchased + 1)}
                  className="w-7 h-7 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center font-bold text-[11px]">
              <div className="bg-emerald-900/60 p-2 rounded-xl">
                <span className="text-slate-300 block text-[9px]">Pelanggan Bayar:</span>
                <span className="text-white text-xs font-black">
                  {formatRupiah(calcResult.customerTotalPaid)}
                </span>
              </div>
              <div className="bg-emerald-900/60 p-2 rounded-xl">
                <span className="text-slate-300 block text-[9px]">Modal Terpakai:</span>
                <span className="text-amber-300 text-xs font-black">
                  {formatRupiah(calcResult.merchantCostUsed)}
                </span>
              </div>
              <div className="bg-emerald-900/60 p-2 rounded-xl">
                <span className="text-emerald-300 block text-[9px]">Untung Langsung Kas:</span>
                <span className="text-emerald-300 text-xs font-black">
                  +{formatRupiah(calcResult.merchantProfitEarned)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step-by-Step Educational Math Explanation */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 space-y-2 text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Penjabaran Logika Hitungan Langkah Demi Langkah:</span>
          </span>
          <div className="space-y-1.5 text-slate-600 text-[11px] leading-relaxed">
            {calcResult.stepByStepExplanation.map((step, idx) => (
              <p key={idx} className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold shrink-0">👉</span>
                <span>{step}</span>
              </p>
            ))}
          </div>
        </div>

        {/* Feedback Message */}
        {applySuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{applySuccess}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleCopySummary}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Ringkasan Hitungan'}</span>
          </button>

          <div className="flex items-center gap-2">
            {selectedProduct && onApplyRetailVariant && (
              <button
                type="button"
                onClick={handleApplyToVariant}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                title={`Simpan varian ${calcResult.retailName} ke produk ${selectedProduct.name}`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Terapkan ke Varian ({selectedProduct.name})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
