import { Product } from '../types';
import { formatRupiah, formatNumberDots } from './formatters';

export { formatRupiah, formatNumberDots };

export interface SmartPricingConfig {
  defaultFloorMargin: number; // Minimal laba kotor per kg, default Rp 500
  roundingStep: number;       // Pembulatan harga ke atas (kelipatan 500)
  includePackagingCost: boolean; // Tambah biaya kemas Rp 250
  includeShrinkage: boolean;     // Tambah buffer susut timbangan sayur
  kviFloorMargin: number;     // Minimal laba barang patokan/KVI (Rp 500)
  onlyKgDetection: boolean;   // Deteksi laba minimal Rp 500 hanya untuk satuan kg
}

export const DEFAULT_SMART_CONFIG: SmartPricingConfig = {
  defaultFloorMargin: 500, // Minimal laba 500 rupiah untuk satuan kg
  roundingStep: 500,
  includePackagingCost: true,
  includeShrinkage: true,
  kviFloorMargin: 500,
  onlyKgDetection: true, // Hanya deteksi perkilonya saja
};

export type ProductTier = 'kvi' | 'leaf' | 'chili_spice' | 'protein' | 'general';

export interface SmartPriceResult {
  productId: string;
  productName: string;
  unit: string;
  isKgUnit: boolean;
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
 * Mendeteksi apakah satuan produk merupakan satuan Kilogram (kg)
 */
export function isKgUnit(unit: string = ''): boolean {
  if (!unit) return false;
  const u = unit.toLowerCase().trim();
  return (
    u === 'kg' ||
    u === 'kilogram' ||
    u === 'kilo' ||
    u === 'kg.' ||
    u.endsWith('/kg') ||
    u.startsWith('kg') ||
    u === '1 kg' ||
    u === '1kg'
  );
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
  const isKg = isKgUnit(product.unit);
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
  // Aturan khusus: Sistem mendeteksi harga perkilonya saja yang minimal ada keuntungan 500 rupiah.
  // Jika satuan bukan kg, tidak dikenakan aturan minimal laba ini ("klo beli yang lainnya gausah di pakaikan itu").
  let floorMargin = config.defaultFloorMargin;
  let tierLabel = 'Umum';

  if (config.onlyKgDetection && !isKg) {
    // Non-kg product (ikat, pcs, pack, buah, butir, dll): Bebas dari deteksi minimal laba kiloan
    floorMargin = 0;
    tierLabel = `Satuan ${product.unit || 'Non-Kg'}`;
  } else if (isKg) {
    floorMargin = config.defaultFloorMargin || 500;
    tierLabel = 'Produk Kiloan (Min Untung Rp 500/kg)';
  } else if (tier === 'kvi') {
    floorMargin = config.kviFloorMargin;
    tierLabel = 'Sembako Patokan (KVI)';
  } else if (tier === 'protein') {
    floorMargin = Math.max(2500, Math.round(costPrice * 0.12));
    tierLabel = 'Protein & Daging (High Risk)';
  } else {
    floorMargin = config.defaultFloorMargin || 500;
    tierLabel = 'Sayur & Bahan Pokok';
  }

  // 5. Laba Saat Ini terhadap Modal
  const rawProfit = currentPrice - costPrice;
  const currentProfit = currentPrice - effectiveCost;

  // isBelowFloor HANYA bernilai TRUE jika:
  // - Produk adalah satuan KG (jika onlyKgDetection aktif)
  // - Laba di bawah batas minimal (500 rupiah per kg)
  let isBelowFloor = false;
  if (config.onlyKgDetection) {
    if (isKg && costPrice > 0 && currentPrice > 0) {
      isBelowFloor = rawProfit < floorMargin || currentProfit < floorMargin;
    } else {
      isBelowFloor = false; // Non-kg tidak pernah dianggap tekor/kena peringatan
    }
  } else {
    isBelowFloor = costPrice > 0 && currentPrice > 0 && currentProfit < floorMargin;
  }

  // 6. Hitung Rekomendasi Harga Pintar Baru
  let suggestedPrice = currentPrice;
  let reason = 'Margin sudah sehat dan aman.';

  if (!isKg && config.onlyKgDetection) {
    reason = `Satuan non-kiloan (${product.unit || 'unit'}). Aturan batas laba Rp 500 hanya berlaku untuk produk satuan kg.`;
  } else if (costPrice <= 0) {
    suggestedPrice = currentPrice;
    reason = 'Modal belum diisi admin.';
  } else if (currentPrice <= 0 || isBelowFloor) {
    // Target harga agar mencapai minimal laba Rp 500/kg
    const rawTarget = Math.max(costPrice + floorMargin, effectiveCost + floorMargin);

    // Pembulatan ke kelipatan 500
    const step = config.roundingStep || 500;
    suggestedPrice = Math.ceil(rawTarget / step) * step;

    if (suggestedPrice - costPrice < floorMargin) {
      suggestedPrice = costPrice + floorMargin;
    }

    if (currentPrice <= 0) {
      reason = `Penetapan harga awal produk kiloan (Modal ${formatRupiah(costPrice)} + Minimal Untung ${formatRupiah(floorMargin)}).`;
    } else {
      reason = `Laba perkilo saat ini (${formatRupiah(rawProfit)}/kg) di bawah batas minimal ${formatRupiah(floorMargin)}. Saran harga: ${formatRupiah(suggestedPrice)}.`;
    }
  }

  const suggestedProfit = suggestedPrice - (isKg ? costPrice : effectiveCost);
  const marginPercent = suggestedPrice > 0 ? (suggestedProfit / suggestedPrice) * 100 : 0;
  const priceDifference = isBelowFloor ? Math.max(0, suggestedPrice - currentPrice) : 0;

  return {
    productId: product.id,
    productName: product.name,
    unit: product.unit,
    isKgUnit: isKg,
    costPrice,
    effectiveCost,
    shrinkageRate,
    packagingCost,
    currentPrice,
    currentProfit: isKg ? rawProfit : currentProfit,
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

/**
 * Parameter untuk Kalkulator Konversi Laba Eceran (Ons/Gram ke Kg)
 */
export interface KgOnsProfitCalcParams {
  kgCostPrice: number;        // Modal kulakan 1 kg (misal Rp 10.000)
  kgSellPrice?: number;       // Harga jual 1 kg utuh (misal Rp 11.000, untung standar Rp 1.000)
  retailGrams?: number;       // Berat eceran dalam gram (default 100g = 1 ons)
  retailSellPrice: number;    // Harga jual ecer (misal Rp 1.200 per 1 ons)
  quantityPurchased?: number; // Jumlah yang dibeli pelanggan (misal 1 ons)
}

/**
 * Hasil Perhitungan Kalkulator Konversi Laba Eceran ke Kg
 */
export interface KgOnsProfitCalcResult {
  kgCostPrice: number;
  kgSellPrice: number;
  retailGrams: number;
  retailName: string;
  portionsPerKg: number;           // 1000 / retailGrams (misal 1 kg = 10 ons)
  retailCostPerPortion: number;    // Modal per porsi eceran (misal Rp 1.000 per 1 ons)
  retailSellPrice: number;         // Harga jual per porsi eceran (misal Rp 1.200)
  profitPerPortion: number;        // Untung per porsi eceran (misal Rp 1.200 - Rp 1.000 = Rp 200)
  
  // Perhitungan total jika 1 kg terjual habis secara eceran:
  totalRetailRevenuePerKg: number; // 10 x Rp 1.200 = Rp 12.000
  totalProfitPerKgIfRetailed: number; // Rp 12.000 - Rp 10.000 = Rp 2.000 untung per kg!
  marginPercentRetailed: number;   // Persentase margin eceran
  
  // Komparasi dengan jual kiloan utuh (grosir):
  kgWholeProfit: number;           // Untung jual kiloan (misal Rp 11.000 - Rp 10.000 = Rp 1.000)
  extraProfitFromRetail: number;   // Rp 2.000 - Rp 1.000 = +Rp 1.000 tambahan untung eceran!
  profitMultiplierPercent: number; // Kenaikan laba dibanding jual kiloan (+100%)
  
  // Simulasi transaksi pembelian:
  quantityPurchased: number;       // Jumlah yang dibeli (misal 1 ons, 2 ons, dll.)
  customerTotalPaid: number;       // Pembeli bayar (1 x Rp 1.200 = Rp 1.200)
  merchantCostUsed: number;        // Modal terpakai (1 x Rp 1.000 = Rp 1.000)
  merchantProfitEarned: number;    // Untung kas masuk transaksi ini (1 x Rp 200 = Rp 200)
  stepByStepExplanation: string[]; // Langkah-langkah penjabaran matematis
}

export function calculateKgOnsProfit(params: KgOnsProfitCalcParams): KgOnsProfitCalcResult {
  const kgCostPrice = Math.max(0, params.kgCostPrice || 0);
  const kgSellPrice = params.kgSellPrice !== undefined && params.kgSellPrice > 0 
    ? params.kgSellPrice 
    : (kgCostPrice > 0 ? kgCostPrice + 1000 : 0);
  const retailGrams = params.retailGrams && params.retailGrams > 0 ? params.retailGrams : 100;
  const portionsPerKg = 1000 / retailGrams;

  let retailName = '1 Ons (100g)';
  if (retailGrams === 100) retailName = '1 Ons (100g)';
  else if (retailGrams === 200) retailName = '2 Ons (200g)';
  else if (retailGrams === 250) retailName = '1/4 Kg (250g)';
  else if (retailGrams === 500) retailName = '1/2 Kg (500g)';
  else retailName = `${retailGrams} gram`;

  const retailSellPrice = Math.max(0, params.retailSellPrice || 0);
  const retailCostPerPortion = Math.round(kgCostPrice * (retailGrams / 1000));
  const profitPerPortion = retailSellPrice - retailCostPerPortion;

  const totalRetailRevenuePerKg = Math.round(retailSellPrice * portionsPerKg);
  const totalProfitPerKgIfRetailed = totalRetailRevenuePerKg - kgCostPrice;
  const marginPercentRetailed = totalRetailRevenuePerKg > 0 ? (totalProfitPerKgIfRetailed / totalRetailRevenuePerKg) * 100 : 0;

  const kgWholeProfit = kgSellPrice - kgCostPrice;
  const extraProfitFromRetail = totalProfitPerKgIfRetailed - kgWholeProfit;
  const profitMultiplierPercent = kgWholeProfit > 0 
    ? ((totalProfitPerKgIfRetailed - kgWholeProfit) / kgWholeProfit) * 100 
    : (totalProfitPerKgIfRetailed > 0 ? 100 : 0);

  const quantityPurchased = params.quantityPurchased && params.quantityPurchased > 0 ? params.quantityPurchased : 1;
  const customerTotalPaid = quantityPurchased * retailSellPrice;
  const merchantCostUsed = quantityPurchased * retailCostPerPortion;
  const merchantProfitEarned = quantityPurchased * profitPerPortion;

  const stepByStepExplanation = [
    `1. Modal kulakan 1 Kg = ${formatRupiah(kgCostPrice)}. Karena 1 Kg = ${portionsPerKg} × ${retailName}, maka modal per ${retailName} adalah ${formatRupiah(retailCostPerPortion)}.`,
    `2. Harga jual ecer per ${retailName} = ${formatRupiah(retailSellPrice)}. Keuntungan langsung per ${retailName} = ${formatRupiah(profitPerPortion)}.`,
    `3. Jika 1 Kg dihabiskan dalam satuan ${retailName} (${portionsPerKg} transaksi), omzet terkumpul = ${formatRupiah(totalRetailRevenuePerKg)}.`,
    `4. Total keuntungan konversi ke 1 Kg = ${formatRupiah(totalRetailRevenuePerKg)} (Omzet) - ${formatRupiah(kgCostPrice)} (Modal) = ${formatRupiah(totalProfitPerKgIfRetailed)}.`,
    `5. Jika dibandingkan jual kiloan utuh (untung ${formatRupiah(kgWholeProfit)}), jual eceran per ons memberikan tambahan laba ekstra +${formatRupiah(extraProfitFromRetail)} per kg.`,
  ];

  return {
    kgCostPrice,
    kgSellPrice,
    retailGrams,
    retailName,
    portionsPerKg,
    retailCostPerPortion,
    retailSellPrice,
    profitPerPortion,
    totalRetailRevenuePerKg,
    totalProfitPerKgIfRetailed,
    marginPercentRetailed,
    kgWholeProfit,
    extraProfitFromRetail,
    profitMultiplierPercent,
    quantityPurchased,
    customerTotalPaid,
    merchantCostUsed,
    merchantProfitEarned,
    stepByStepExplanation,
  };
}
