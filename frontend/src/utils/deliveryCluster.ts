// Utilitas Manajemen Kluster, Desa/Kelurahan & Optimasi Rute Pengantaran (Anti-Loncat) JogoPawon Pasuruan

export interface DeliveryCluster {
  id: string;
  name: string;
  category: 'hospital' | 'residential' | 'office' | 'village';
  badge: string;
  description: string;
  lat: number;
  lng: number;
  radiusKm: number;
  minBatchOrders: number; // Minimal pesanan agar pengantaran ekonomis & efisien
  defaultDeliveryFee: number;
  sharedDeliveryFee: number; // Ongkir hemat jika barengan / kuota tercapai
  pickupPointSuggestion: string;
}

// Titik Awal Gudang / Sentra Distribusi Subuh JogoPawon (Pohjentrek / Susukanrejo)
export const JOGOPAWON_BASE_COORDS = {
  lat: -7.6650,
  lng: 112.8850,
  name: 'Sentra Distribusi Subuh JogoPawon (Pohjentrek/Susukanrejo)',
};

// Master Data Kelurahan / Desa di Pasuruan Kota & Sekitarnya
export interface PasuruanDesa {
  id: string;
  name: string;
  kecamatan: string;
  lat: number;
  lng: number;
}

export const PASURUAN_DESA_LIST: PasuruanDesa[] = [
  // Kec. Purworejo
  { id: 'desa-purutrejo', name: 'Purutrejo (RSUD)', kecamatan: 'Purworejo', lat: -7.6433, lng: 112.9103 },
  { id: 'desa-kebonagung', name: 'Kebonagung', kecamatan: 'Purworejo', lat: -7.6520, lng: 112.8950 },
  { id: 'desa-purworejo', name: 'Purworejo', kecamatan: 'Purworejo', lat: -7.6560, lng: 112.8990 },
  { id: 'desa-pohjentrek', name: 'Pohjentrek Kota', kecamatan: 'Purworejo', lat: -7.6610, lng: 112.8910 },
  { id: 'desa-wiroborang', name: 'Wiroborang', kecamatan: 'Purworejo', lat: -7.6590, lng: 112.9090 },
  { id: 'desa-sekargadung', name: 'Sekargadung', kecamatan: 'Purworejo', lat: -7.6640, lng: 112.9180 },

  // Kec. Bugul Kidul
  { id: 'desa-bugul-kidul', name: 'Bugul Kidul', kecamatan: 'Bugul Kidul', lat: -7.6550, lng: 112.9190 },
  { id: 'desa-krampyangan', name: 'Krampyangan', kecamatan: 'Bugul Kidul', lat: -7.6620, lng: 112.9250 },
  { id: 'desa-tapaan', name: 'Tapaan', kecamatan: 'Bugul Kidul', lat: -7.6500, lng: 112.9260 },
  { id: 'desa-kepel', name: 'Kepel', kecamatan: 'Bugul Kidul', lat: -7.6450, lng: 112.9320 },
  { id: 'desa-blandongan', name: 'Blandongan', kecamatan: 'Bugul Kidul', lat: -7.6550, lng: 112.9370 },
  { id: 'desa-bakalan', name: 'Bakalan', kecamatan: 'Bugul Kidul', lat: -7.6670, lng: 112.9340 },

  // Kec. Panggungrejo (Pusat Kota)
  { id: 'desa-bangilan', name: 'Bangilan', kecamatan: 'Panggungrejo', lat: -7.6390, lng: 112.9080 },
  { id: 'desa-kebonsari', name: 'Kebonsari', kecamatan: 'Panggungrejo', lat: -7.6410, lng: 112.9050 },
  { id: 'desa-panggungrejo', name: 'Panggungrejo', kecamatan: 'Panggungrejo', lat: -7.6320, lng: 112.9110 },
  { id: 'desa-trajeng', name: 'Trajeng', kecamatan: 'Panggungrejo', lat: -7.6360, lng: 112.9030 },
  { id: 'desa-mayangan', name: 'Mayangan', kecamatan: 'Panggungrejo', lat: -7.6300, lng: 112.9150 },
  { id: 'desa-ngemplakrejo', name: 'Ngemplakrejo', kecamatan: 'Panggungrejo', lat: -7.6330, lng: 112.9070 },
  { id: 'desa-tambaan', name: 'Tambaan', kecamatan: 'Panggungrejo', lat: -7.6270, lng: 112.9090 },
  { id: 'desa-karanganyar', name: 'Karanganyar', kecamatan: 'Panggungrejo', lat: -7.6350, lng: 112.9120 },
  { id: 'desa-pekuncen', name: 'Pekuncen', kecamatan: 'Panggungrejo', lat: -7.6410, lng: 112.9130 },
  { id: 'desa-petamanan', name: 'Petamanan', kecamatan: 'Panggungrejo', lat: -7.6440, lng: 112.9150 },
  { id: 'desa-mandaranrejo', name: 'Mandaranrejo', kecamatan: 'Panggungrejo', lat: -7.6310, lng: 112.9180 },

  // Kec. Gadingrejo
  { id: 'desa-gadingrejo', name: 'Gadingrejo', kecamatan: 'Gadingrejo', lat: -7.6420, lng: 112.8790 },
  { id: 'desa-bukir', name: 'Bukir', kecamatan: 'Gadingrejo', lat: -7.6490, lng: 112.8730 },
  { id: 'desa-karangketug', name: 'Karangketug', kecamatan: 'Gadingrejo', lat: -7.6450, lng: 112.8680 },
  { id: 'desa-randusari', name: 'Randusari', kecamatan: 'Gadingrejo', lat: -7.6410, lng: 112.8730 },
  { id: 'desa-krapyakrejo', name: 'Krapyakrejo', kecamatan: 'Gadingrejo', lat: -7.6480, lng: 112.8820 },
  { id: 'desa-gentong', name: 'Gentong', kecamatan: 'Gadingrejo', lat: -7.6380, lng: 112.8850 },
  { id: 'desa-petahunan', name: 'Petahunan', kecamatan: 'Gadingrejo', lat: -7.6370, lng: 112.8750 },
  { id: 'desa-sebani', name: 'Sebani', kecamatan: 'Gadingrejo', lat: -7.6340, lng: 112.8790 },
  { id: 'desa-tambakrejo', name: 'Tambakrejo', kecamatan: 'Gadingrejo', lat: -7.6280, lng: 112.8840 },

  // Wilayah Sekitar (Kabupaten / Mitra Gudang)
  { id: 'desa-susukanrejo', name: 'Susukanrejo (Base JogoPawon)', kecamatan: 'Pohjentrek Kab', lat: -7.6650, lng: 112.8850 },
  { id: 'desa-gondangwetan', name: 'Gondangwetan', kecamatan: 'Gondangwetan', lat: -7.6750, lng: 112.9250 },
  { id: 'desa-kraton', name: 'Kraton Pasuruan', kecamatan: 'Kraton', lat: -7.6350, lng: 112.8550 },
];

// Master Kluster Wilayah Pasuruan Kota & Sekitarnya
export const PASURUAN_DELIVERY_CLUSTERS: DeliveryCluster[] = [
  {
    id: 'cluster-rsud-purut',
    name: 'Kluster RSUD dr. R. Soedarsono (Purut)',
    category: 'hospital',
    badge: '🏥 RS & Nakes',
    description: 'Area RSUD Purut, Jl. Dr. Wahidin Sudirohusodo & pemukiman nakes sekitar',
    lat: -7.6433,
    lng: 112.9103,
    radiusKm: 1.5,
    minBatchOrders: 3,
    defaultDeliveryFee: 5000,
    sharedDeliveryFee: 2000,
    pickupPointSuggestion: 'Lobi Depan / Pos Satpam Utama / Ruang Nakes',
  },
  {
    id: 'cluster-rs-hermina',
    name: 'Kluster RS Hermina & Sekitar Pleret',
    category: 'hospital',
    badge: '🏥 RS & Klinik',
    description: 'Area Jl. KH. Mansyur, RS Hermina, dan sekitarnya',
    lat: -7.6521,
    lng: 112.9034,
    radiusKm: 1.5,
    minBatchOrders: 3,
    defaultDeliveryFee: 5000,
    sharedDeliveryFee: 2000,
    pickupPointSuggestion: 'Pos Jaga Masuk / Pos Satpam',
  },
  {
    id: 'cluster-bugul-sekargadung',
    name: 'Kluster Perumahan Bugul Kidul & Sekargadung',
    category: 'residential',
    badge: '🏡 Perumahan',
    description: 'Kompleks perumahan Bugul Permai, Sekargadung, Tapaan & Kepel',
    lat: -7.6580,
    lng: 112.9210,
    radiusKm: 2.5,
    minBatchOrders: 3,
    defaultDeliveryFee: 5000,
    sharedDeliveryFee: 1500,
    pickupPointSuggestion: 'Pagar Depan / Pos RW / Langsung ke Rumah',
  },
  {
    id: 'cluster-purworejo-kebonagung',
    name: 'Kluster Purworejo, Kebonagung & Pohjentrek',
    category: 'village',
    badge: '🌾 Desa & Pemukiman',
    description: 'Wilayah Purworejo, Kebonagung, Pohjentrek, dekat sentra distribusi JogoPawon',
    lat: -7.6550,
    lng: 112.8900,
    radiusKm: 3.0,
    minBatchOrders: 2,
    defaultDeliveryFee: 3000,
    sharedDeliveryFee: 1000,
    pickupPointSuggestion: 'Langsung Antar ke Pintu Rumah',
  },
  {
    id: 'cluster-panggungrejo-kota',
    name: 'Kluster Panggungrejo, Bangilan & Trajeng',
    category: 'residential',
    badge: '🏙️ Pusat Kota',
    description: 'Pasuruan Kota, kawasan Alun-Alun, Stasiun, Panggungrejo, Trajeng',
    lat: -7.6360,
    lng: 112.9070,
    radiusKm: 2.0,
    minBatchOrders: 3,
    defaultDeliveryFee: 5000,
    sharedDeliveryFee: 2000,
    pickupPointSuggestion: 'Alamat Rumah / Kantor',
  },
  {
    id: 'cluster-gadingrejo',
    name: 'Kluster Gadingrejo & Karangketug',
    category: 'village',
    badge: '🏡 Wilayah Barat',
    description: 'Kawasan Gadingrejo, Karangketug, Randusari & Bukir',
    lat: -7.6450,
    lng: 112.8750,
    radiusKm: 2.5,
    minBatchOrders: 3,
    defaultDeliveryFee: 5000,
    sharedDeliveryFee: 2000,
    pickupPointSuggestion: 'Pagar Depan / Titik Kumpul RT',
  },
  {
    id: 'cluster-perkantoran-pemkab',
    name: 'Kluster Perkantoran Pemkab & Pemkot Pasuruan',
    category: 'office',
    badge: '🏢 Perkantoran ASN',
    description: 'Kompleks perkantoran ASN, Bappeda, Dinas, Pengadilan & BPN',
    lat: -7.6490,
    lng: 112.9050,
    radiusKm: 1.5,
    minBatchOrders: 3,
    defaultDeliveryFee: 5000,
    sharedDeliveryFee: 2000,
    pickupPointSuggestion: 'Resepsionis Dinas / Pos Keamanan Gerbang',
  },
];

/**
 * Hitung jarak antar koordinat lat/lng menggunakan Rumus Haversine (dalam kilometer)
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius bumi dalam km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Mencari kluster terdekat berdasarkan koordinat GPS pengguna
 */
export function findNearestCluster(
  lat: number,
  lng: number,
  clusters: DeliveryCluster[] = PASURUAN_DELIVERY_CLUSTERS
): { cluster: DeliveryCluster; distanceKm: number; isWithinRadius: boolean } | null {
  if (!lat || !lng) return null;

  let nearestCluster: DeliveryCluster | null = null;
  let minDistance = Infinity;

  for (const c of clusters) {
    const dist = calculateHaversineDistanceKm(lat, lng, c.lat, c.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestCluster = c;
    }
  }

  if (!nearestCluster) return null;

  return {
    cluster: nearestCluster,
    distanceKm: parseFloat(minDistance.toFixed(2)),
    isWithinRadius: minDistance <= nearestCluster.radiusKm,
  };
}

/**
 * Deteksi Desa / Kelurahan Pasuruan dari teks alamat atau koordinat GPS
 */
export function detectDesaKelurahan(order: any): { desaName: string; kecamatan: string; lat?: number; lng?: number } {
  const addressText = ((order.delivery_address || '') + ' ' + (order.delivery_note || '')).toLowerCase();

  // 1. Cek pencocokan kata kunci nama desa dalam alamat
  for (const d of PASURUAN_DESA_LIST) {
    const cleanName = d.name.toLowerCase().replace(/\(.*?\)/g, '').trim();
    if (cleanName.length >= 4 && addressText.includes(cleanName)) {
      return { desaName: d.name, kecamatan: d.kecamatan, lat: d.lat, lng: d.lng };
    }
  }

  // 2. Jika ada GPS koordinat, cari desa terdekat
  if (order.latitude && order.longitude) {
    let nearestDesa: PasuruanDesa | null = null;
    let minDist = Infinity;
    for (const d of PASURUAN_DESA_LIST) {
      const dist = calculateHaversineDistanceKm(order.latitude, order.longitude, d.lat, d.lng);
      if (dist < minDist) {
        minDist = dist;
        nearestDesa = d;
      }
    }
    if (nearestDesa && minDist <= 2.5) {
      return { desaName: nearestDesa.name, kecamatan: nearestDesa.kecamatan, lat: nearestDesa.lat, lng: nearestDesa.lng };
    }
  }

  // 3. Fallback jika ada info cluster
  if (order.delivery_cluster) {
    const cluster = PASURUAN_DELIVERY_CLUSTERS.find(c => c.name.toLowerCase() === order.delivery_cluster.toLowerCase());
    if (cluster) {
      return { desaName: cluster.name, kecamatan: 'Pasuruan', lat: cluster.lat, lng: cluster.lng };
    }
  }

  return { desaName: 'Pasuruan Kota (Lainnya)', kecamatan: 'Pasuruan' };
}

/**
 * ALGORITMA OPTIMASI RUTE PENGANTARAN (ANTI-LONCAT / NEAREST NEIGHBOR ROUTING)
 * Mengurutkan titik-titik pesanan dari Gudang JogoPawon -> Stop 1 -> Stop 2 -> Stop N
 * sehingga kurir tidak jalan bolak-balik atau meloncat-loncat.
 */
export interface SequencedOrderItem {
  order: any;
  stopNumber: number;
  distanceFromPrevKm: number;
  cumulativeDistanceKm: number;
}

export function sequenceDeliveryRoute(
  orders: any[],
  startPoint = JOGOPAWON_BASE_COORDS
): SequencedOrderItem[] {
  if (!orders || orders.length === 0) return [];

  // Salin daftar pesanan yang belum dikunjungi
  const unvisited = [...orders];
  const sequenced: SequencedOrderItem[] = [];

  let currentLat = startPoint.lat;
  let currentLng = startPoint.lng;
  let totalKm = 0;
  let stopIndex = 1;

  while (unvisited.length > 0) {
    let bestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const ord = unvisited[i];
      let ordLat = ord.latitude;
      let ordLng = ord.longitude;

      if (!ordLat || !ordLng) {
        const detected = detectDesaKelurahan(ord);
        ordLat = detected.lat || startPoint.lat;
        ordLng = detected.lng || startPoint.lng;
      }

      const dist = calculateHaversineDistanceKm(currentLat, currentLng, ordLat, ordLng);
      if (dist < minDistance) {
        minDistance = dist;
        bestIndex = i;
      }
    }

    const selectedOrder = unvisited.splice(bestIndex, 1)[0];
    const distFromPrev = parseFloat(minDistance.toFixed(2));
    totalKm += distFromPrev;

    sequenced.push({
      order: selectedOrder,
      stopNumber: stopIndex,
      distanceFromPrevKm: distFromPrev,
      cumulativeDistanceKm: parseFloat(totalKm.toFixed(2)),
    });

    // Pindahkan titik kurir saat ini ke lokasi pesanan yang baru diselesaikan
    let nextLat = selectedOrder.latitude;
    let nextLng = selectedOrder.longitude;
    if (!nextLat || !nextLng) {
      const detected = detectDesaKelurahan(selectedOrder);
      nextLat = detected.lat || currentLat;
      nextLng = detected.lng || currentLng;
    }
    currentLat = nextLat;
    currentLng = nextLng;
    stopIndex++;
  }

  return sequenced;
}

/**
 * Logika Pengelompokan Pesanan Berdasarkan Desa / Kelurahan
 */
export interface DesaOrderGroup {
  desaId: string;
  desaName: string;
  kecamatan: string;
  totalOrders: number;
  totalRevenue: number;
  sequencedOrders: SequencedOrderItem[];
}

export function groupOrdersByDesa(orders: any[]): DesaOrderGroup[] {
  const groups: Record<string, { desaName: string; kecamatan: string; orders: any[]; totalRevenue: number }> = {};

  orders.forEach((order) => {
    const { desaName, kecamatan } = detectDesaKelurahan(order);
    const key = desaName;

    if (!groups[key]) {
      groups[key] = {
        desaName,
        kecamatan,
        orders: [],
        totalRevenue: 0,
      };
    }

    groups[key].orders.push(order);
    groups[key].totalRevenue += order.total_amount || 0;
  });

  return Object.entries(groups)
    .map(([key, data]) => {
      // Urutkan rute pesanan di dalam desa ini agar anti-loncat
      const sequenced = sequenceDeliveryRoute(data.orders);
      return {
        desaId: 'desa-' + key.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        desaName: data.desaName,
        kecamatan: data.kecamatan,
        totalOrders: data.orders.length,
        totalRevenue: data.totalRevenue,
        sequencedOrders: sequenced,
      };
    })
    .sort((a, b) => b.totalOrders - a.totalOrders);
}

/**
 * Logika Pengelompokan Pesanan Berdasarkan Kluster untuk Admin & Kurir (dengan Rute Terurut Jarak)
 */
export interface ClusterOrderGroup {
  clusterId: string;
  clusterName: string;
  badge: string;
  pickupSuggestion: string;
  minBatchOrders: number;
  totalOrders: number;
  totalRevenue: number;
  isReadyForBatchDelivery: boolean;
  orders: any[];
  sequencedOrders: SequencedOrderItem[]; // Rute anti-loncat yang sudah diurutkan sesuai jarak
}

export function groupOrdersByCluster(
  orders: any[],
  clusters: DeliveryCluster[] = PASURUAN_DELIVERY_CLUSTERS
): ClusterOrderGroup[] {
  const groups: Record<string, ClusterOrderGroup> = {};

  // Inisialisasi grup master kluster
  clusters.forEach((c) => {
    groups[c.id] = {
      clusterId: c.id,
      clusterName: c.name,
      badge: c.badge,
      pickupSuggestion: c.pickupPointSuggestion,
      minBatchOrders: c.minBatchOrders,
      totalOrders: 0,
      totalRevenue: 0,
      isReadyForBatchDelivery: false,
      orders: [],
      sequencedOrders: [],
    };
  });

  // Grup khusus untuk yang belum terdefinisi / umum
  const defaultGroupId = 'cluster-lainnya';
  groups[defaultGroupId] = {
    clusterId: defaultGroupId,
    clusterName: 'Wilayah Pasuruan Lainnya / Reguler',
    badge: '📍 Umum',
    pickupSuggestion: 'Alamat Rumah Langsung',
    minBatchOrders: 1,
    totalOrders: 0,
    totalRevenue: 0,
    isReadyForBatchDelivery: true,
    orders: [],
    sequencedOrders: [],
  };

  orders.forEach((order) => {
    // 1. Cek apakah order sudah memiliki atribut delivery_cluster
    let matchedClusterId: string | null = null;

    if (order.delivery_cluster) {
      const found = clusters.find(
        (c) => c.name.toLowerCase() === order.delivery_cluster.toLowerCase() || c.id === order.delivery_cluster
      );
      if (found) matchedClusterId = found.id;
    }

    // 2. Jika belum ada atau tidak cocok, cek koordinat jika ada
    if (!matchedClusterId && order.latitude && order.longitude) {
      const nearest = findNearestCluster(order.latitude, order.longitude, clusters);
      if (nearest && nearest.isWithinRadius) {
        matchedClusterId = nearest.cluster.id;
      }
    }

    // 3. Jika belum ketemu, cek kata kunci alamat (misal: "RSUD", "Hermina", "Bugul", "Purworejo")
    if (!matchedClusterId && order.delivery_address) {
      const addrLower = (order.delivery_address + ' ' + (order.delivery_note || '')).toLowerCase();
      if (addrLower.includes('rsud') || addrLower.includes('purut') || addrLower.includes('soedarsono')) {
        matchedClusterId = 'cluster-rsud-purut';
      } else if (addrLower.includes('hermina') || addrLower.includes('pleret')) {
        matchedClusterId = 'cluster-rs-hermina';
      } else if (addrLower.includes('bugul') || addrLower.includes('sekargadung') || addrLower.includes('tapaan')) {
        matchedClusterId = 'cluster-bugul-sekargadung';
      } else if (addrLower.includes('purworejo') || addrLower.includes('kebonagung') || addrLower.includes('pohjentrek')) {
        matchedClusterId = 'cluster-purworejo-kebonagung';
      } else if (addrLower.includes('gadingrejo') || addrLower.includes('karangketug') || addrLower.includes('bukir')) {
        matchedClusterId = 'cluster-gadingrejo';
      } else if (addrLower.includes('pemkab') || addrLower.includes('pemkot') || addrLower.includes('dinas') || addrLower.includes('kantor')) {
        matchedClusterId = 'cluster-perkantoran-pemkab';
      } else if (addrLower.includes('alun') || addrLower.includes('panggungrejo') || addrLower.includes('bangilan') || addrLower.includes('trajeng')) {
        matchedClusterId = 'cluster-panggungrejo-kota';
      }
    }

    const targetGroupId = matchedClusterId && groups[matchedClusterId] ? matchedClusterId : defaultGroupId;
    groups[targetGroupId].orders.push(order);
    groups[targetGroupId].totalOrders += 1;
    groups[targetGroupId].totalRevenue += order.total_amount || 0;
  });

  // Tentukan apakah ready for batch delivery dan urutkan rute anti-loncat
  Object.values(groups).forEach((grp) => {
    grp.isReadyForBatchDelivery = grp.totalOrders >= grp.minBatchOrders;
    if (grp.orders.length > 0) {
      const clusterCenter = clusters.find(c => c.id === grp.clusterId) || JOGOPAWON_BASE_COORDS;
      grp.sequencedOrders = sequenceDeliveryRoute(grp.orders, {
        lat: clusterCenter.lat,
        lng: clusterCenter.lng,
        name: grp.clusterName,
      });
    }
  });

  // Kembalikan hanya kluster yang memiliki minimal 1 pesanan, diurutkan dari order terbanyak
  return Object.values(groups)
    .filter((grp) => grp.totalOrders > 0)
    .sort((a, b) => b.totalOrders - a.totalOrders);
}
