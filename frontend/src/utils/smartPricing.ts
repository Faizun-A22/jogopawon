import { Product } from '../types';

export interface SmartPricingConfig {
  defaultFloorMargin: number; // Minimal laba kotor, default Rp 700
  roundingStep: number;       // Pembulatan harga ke atas (kelipatan 500)
  includePackagingCost: boolean; // Tambah biaya kemas Rp 250
  includeShrinkage: boolean;     // Tambah buffer susut timbangan sayur
  kviFloorMargin: number;     // Minimal laba barang patokan/KVI (Rp 400 - Rp 500)
}

export const DEFAULT_SMART_CONFIG: SmartPricingConfig = {
  defaultFloorMargin: 700,
  roundingStep: 500,
  includePackagingCost: true,
  includeShrinkage: true,
  kviFloorMargin: 500,
};

export type ProductTier = 'kvi' | 'leaf' | 'chili_spice' | 'protein' | 'general';

export interface SmartPriceResult {
  productId: string;
  productName: string;
  unit: string;
  costPrice: number;
  effectiveCost: number;
  shrinkageRate: number;
  packagingCost: number;
  currentPrice: number;
  currentProfit: number;
  floorMargin: number;
  suggestedPrice: number;
  suggestedProfit: number;
  marginPercent: number;
  isBelowFloor: boolean;
  priceDifference: number;
  tier: ProductTier;
  tierLabel: string;
  reason: string;
}

/**
 * Mendeteksi tipe produk berdasarkan nama atau kategori
 * untuk menentukan estimasi susut timbangan & aturan margin.
 */
export function detectProductTier(productName: string, categoryName: string = ''): ProductTier {
  const text = (productName + ' ' + categoryName).toLowerCase();

  // 1. KVI (Known Value Items - Sembako Patokan Kampung yang harganya dihafal pembeli)
  if (
    text.includes('minyak') ||
    text.includes('beras') ||
    text.includes('gula pasir') ||
    text.includes('telur ayam') ||
    text.includes('terigu') ||
    text.includes('indomie')
  ) {
    return 'kvi';
  }

  // 2. Daging / Ayam / Ikan (Protein hewani dengan susut es & darah timbangan)
  if (
    text.includes('ayam') ||
    text.includes('daging') ||
    text.includes('ikan') ||
    text.includes('lele') ||
    text.includes('udang') ||
    text.includes('tongkol') ||
    text.includes('gurami') ||
    text.includes('patin')
  ) {
    return 'protein';
  }

  // 3. Sayur Daun & Jamur Segar (Susut tinggi karena akar dipotong & daun layu disortir)
  if (
    text.includes('bayam') ||
    text.includes('kangkung') ||
    text.includes('sawi') ||
    text.includes('pakcoy') ||
    text.includes('selada') ||
    text.includes('seledri') ||
    text.includes('daun bawang') ||
    text.includes('tauge') ||
    text.includes('jamur') ||
    text.includes('kemangi')
  ) {
    return 'leaf';
  }

  // 4. Cabai & Bumbu Dapur Segar
  if (
    text.includes('cabai') ||
    text.includes('cabe') ||
    text.includes('rawit') ||
    text.includes('bawang') ||
    text.includes('tomat') ||
    text.includes('kunyit') ||
    text.includes('jahe') ||
    text.includes('lengkuas') ||
    text.includes('kencur')
  ) {
    return 'chili_spice';
  }

  return 'general';
}

/**
 * Menghitung harga pintar, modal riil, susut, serta rekomendasi harga jual
 */
export function calculateSmartPrice(
  product: Product,
  costPriceOverride?: number,
  currentPriceOverride?: number,
  config: SmartPricingConfig = DEFAULT_SMART_CONFIG
): SmartPriceResult {
  const costPrice = costPriceOverride !== undefined ? costPriceOverride : (product.cost_price || 0);
  const currentPrice = currentPriceOverride !== undefined ? currentPriceOverride : (product.price || 0);
  const tier = detectProductTier(product.name, product.category_id);

  // 1. Tentukan Tingkat Susut Timbangan (Shrinkage Rate)
  let shrinkageRate = 0;
  if (config.includeShrinkage) {
    switch (tier) {
      case 'leaf':
        shrinkageRate = 0.08; // 8% susut akar/daun kuning
        break;
      case 'chili_spice':
        shrinkageRate = 0.05; // 5% susut tangkai & penguapan
        break;
      case 'protein':
        shrinkageRate = 0.05; // 5% susut es & tetesan air
        break;
      case 'kvi':
        shrinkageRate = 0.0; // Sembako kemasan 0%
        break;
      default:
        shrinkageRate = 0.03; // Sayur buah / umbi 3%
        break;
    }
  }

  // 2. Biaya Kemas (Plastik seal, label pemesan subuh)
  const packagingCost = config.includePackagingCost && tier !== 'kvi' ? 250 : 0;

  // 3. Modal Efektif Riil
  const effectiveCost = Math.round(costPrice * (1 + shrinkageRate) + packagingCost);

  // 4. Batas Keuntungan Minimal (Floor Margin)
  let floorMargin = config.defaultFloorMargin;
  let tierLabel = 'Umum';

  if (tier === 'kvi') {
    floorMargin = config.kviFloorMargin;
    tierLabel = 'Sembako Patokan (KVI)';
  } else if (tier === 'protein') {
    floorMargin = Math.max(2500, Math.round(costPrice * 0.12)); // Minimal Rp 2.500 atau 12%
    tierLabel = 'Protein & Daging (High Risk)';
  } else if (tier === 'leaf') {
    floorMargin = Math.max(config.defaultFloorMargin, 800);
    tierLabel = 'Sayur Daun Segar';
  } else if (tier === 'chili_spice') {
    floorMargin = Math.max(config.defaultFloorMargin, 800);
    tierLabel = 'Cabai & Bumbu Dapur';
  } else {
    if (costPrice > 15000) {
      floorMargin = Math.max(1500, Math.round(costPrice * 0.12));
    } else if (costPrice > 5000) {
      floorMargin = Math.max(1000, config.defaultFloorMargin);
    }
    tierLabel = 'Sayur & Bahan Pokok';
  }

  // 5. Laba Saat Ini terhadap Modal Efektif
  const currentProfit = currentPrice - effectiveCost;
  const isBelowFloor = currentPrice > 0 && currentProfit < floorMargin;

  // 6. Hitung Rekomendasi Harga Pintar Baru
  let suggestedPrice = currentPrice;
  let reason = 'Margin sudah sehat dan aman.';

  if (costPrice <= 0) {
    suggestedPrice = currentPrice;
    reason = 'Modal belum diisi admin.';
  } else if (currentPrice <= 0 || isBelowFloor) {
    // Target harga sebelum pembulatan
    const rawTarget = effectiveCost + floorMargin;

    // Pembulatan psikologis ke atas (Rounding ke kelipatan 500)
    const step = config.roundingStep || 500;
    suggestedPrice = Math.ceil(rawTarget / step) * step;

    if (currentPrice <= 0) {
      reason = `Penetapan harga awal pintar (Floor margin ${floorMargin} + Rounding ${step}).`;
    } else {
      reason = `Laba saat ini (Rp ${currentProfit.toLocaleString('id-ID')}) di bawah ambang batas Rp ${floorMargin.toLocaleString('id-ID')}. Auto-markup diterapkan.`;
    }
  }

  const suggestedProfit = suggestedPrice - effectiveCost;
  const marginPercent = suggestedPrice > 0 ? (suggestedProfit / suggestedPrice) * 100 : 0;
  const priceDifference = Math.max(0, suggestedPrice - currentPrice);

  return {
    productId: product.id,
    productName: product.name,
    unit: product.unit,
    costPrice,
    effectiveCost,
    shrinkageRate,
    packagingCost,
    currentPrice,
    currentProfit,
    floorMargin,
    suggestedPrice,
    suggestedProfit,
    marginPercent,
    isBelowFloor,
    priceDifference,
    tier,
    tierLabel,
    reason,
  };
}

/**
 * Menganalisis seluruh katalog produk untuk melihat kesehatan margin
 */
export function analyzeCatalogMargins(
  products: Product[],
  quickPriceEdits: Record<string, { price: number; cost_price: number; stock: number }> = {},
  config: SmartPricingConfig = DEFAULT_SMART_CONFIG
) {
  let criticalCount = 0;   // Untung < floor margin (Tekor / Butuh Markup)
  let fairCount = 0;       // Untung Rp 700 - Rp 999 (Pas)
  let healthyCount = 0;    // Untung >= Rp 1.000 (Sehat)
  let zeroCostCount = 0;   // Modal belum diisi
  let totalPotentialGain = 0; // Total potensi tambahan keuntungan jika semua produk tekor dimarkup

  const results: SmartPriceResult[] = [];

  for (const prod of products) {
    const edit = quickPriceEdits[prod.id];
    const costPrice = edit?.cost_price !== undefined ? edit.cost_price : (prod.cost_price || 0);
    const currentPrice = edit?.price !== undefined ? edit.price : (prod.price || 0);

    const res = calculateSmartPrice(prod, costPrice, currentPrice, config);
    results.push(res);

    if (costPrice <= 0) {
      zeroCostCount++;
    } else if (res.isBelowFloor) {
      criticalCount++;
      totalPotentialGain += res.priceDifference;
    } else if (res.currentProfit < 1000) {
      fairCount++;
    } else {
      healthyCount++;
    }
  }

  return {
    results,
    criticalCount,
    fairCount,
    healthyCount,
    zeroCostCount,
    totalPotentialGain,
  };
}

/**
 * Menghasilkan set perubahan harga (quick edits) untuk semua produk yang berada di bawah ambang batas keuntungan
 */
export function generateAutoMarkupEdits(
  products: Product[],
  currentEdits: Record<string, { price: number; cost_price: number; stock: number }> = {},
  config: SmartPricingConfig = DEFAULT_SMART_CONFIG
): {
  newEdits: Record<string, { price: number; cost_price: number; stock: number }>;
  updatedCount: number;
  totalGain: number;
} {
  const newEdits = { ...currentEdits };
  let updatedCount = 0;
  let totalGain = 0;

  for (const prod of products) {
    const edit = currentEdits[prod.id];
    const costPrice = edit?.cost_price !== undefined ? edit.cost_price : (prod.cost_price || 0);
    const currentPrice = edit?.price !== undefined ? edit.price : (prod.price || 0);
    const stock = edit?.stock !== undefined ? edit.stock : (prod.stock || 0);

    if (costPrice <= 0) continue;

    const analysis = calculateSmartPrice(prod, costPrice, currentPrice, config);

    // Jika di bawah floor margin dan ada saran kenaikan harga
    if (analysis.isBelowFloor && analysis.suggestedPrice > currentPrice) {
      newEdits[prod.id] = {
        price: analysis.suggestedPrice,
        cost_price: costPrice,
        stock,
      };
      updatedCount++;
      totalGain += analysis.priceDifference;
    }
  }

  return {
    newEdits,
    updatedCount,
    totalGain,
  };
}
