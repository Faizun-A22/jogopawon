import {
  Product,
  Category,
  DeliverySlot,
  Order,
  AdminStats,
  WSMessage,
  ProcurementItem,
  FinancialReport,
  WasteRecord,
  Courier,
  Review,
  User,
  UserAddress,
  RewardItem,
  RewardRedemption,
  CashTransaction,
  AccountingSummary,
  ScrapedPriceItem,
  ScraperSummary,
  ReferralInfo,
} from '../types';

const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL && !import.meta.env.VITE_API_BASE_URL.includes('localhost')) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return `${window.location.origin}/api`;
  }
  return '/api';
};

const getWsUrl = (): string => {
  if (import.meta.env.VITE_WS_URL && !import.meta.env.VITE_WS_URL.includes('localhost')) {
    return import.meta.env.VITE_WS_URL;
  }
  if (typeof window !== 'undefined' && window.location && window.location.host) {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${window.location.host}/ws`;
  }
  return '/ws';
};

const API_BASE_URL = getApiBaseUrl();
const WS_URL = getWsUrl();

export const normalizeImageUrl = (url?: string): string => {
  if (!url) return '/logo.webp';
  if (url.includes('.r2.dev/')) {
    const parts = url.split('.r2.dev/');
    return `/api/images/${parts[1]}`;
  }
  return url;
};


// Helper to get Bearer Authorization header for admin endpoints
export const getAdminAuthHeaders = (): Record<string, string> => {
  let token =
    (typeof window !== 'undefined' &&
      (localStorage.getItem('jogopawon_admin_token') || sessionStorage.getItem('jogopawon_admin_token'))) ||
    '';
  token = token.trim();
  if (token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1).trim();
  }
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Central helper to validate admin responses, handle 401 expiration, and unpack error messages
export const handleAdminResponse = async (res: Response, defaultErrMsg: string) => {
  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('jogopawon_admin_auth');
        sessionStorage.removeItem('jogopawon_admin_auth');
        localStorage.removeItem('jogopawon_admin_token');
        sessionStorage.removeItem('jogopawon_admin_token');
        window.dispatchEvent(new Event('jogopawon_admin_unauthorized'));
      }
      throw new Error('Sesi admin telah kedaluwarsa atau belum masuk. Silakan masukkan PIN Admin kembali.');
    }
    let errMsg = defaultErrMsg;
    try {
      const errJson = await res.json();
      errMsg = errJson.error || errJson.message || errMsg;
    } catch {
      try {
        const errText = await res.text();
        if (errText) errMsg = errText;
      } catch {}
    }
    throw new Error(errMsg);
  }
};

// Helper to get Bearer Authorization header for customer endpoints
export const getCustomerAuthHeaders = (): Record<string, string> => {
  let token =
    (typeof window !== 'undefined' &&
      (localStorage.getItem('jogopawon_customer_token') || sessionStorage.getItem('jogopawon_customer_token'))) ||
    '';
  if (!token && typeof window !== 'undefined') {
    try {
      const u = JSON.parse(localStorage.getItem('jogopawon_customer_user') || '{}');
      if (u && u.token) token = u.token;
    } catch {}
  }
  return token ? { Authorization: 'Bearer ' + token } : {};
};

export const api = {
  async getCategories(): Promise<Category[]> {
    const res = await fetch(`${API_BASE_URL}/categories`);
    if (!res.ok) throw new Error('Gagal memuat kategori');
    return res.json();
  },

  async addCategory(category: Omit<Category, 'id'>): Promise<Category> {
    const res = await fetch(`${API_BASE_URL}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
      body: JSON.stringify(category),
    });
    if (!res.ok) throw new Error('Gagal menambah kategori');
    return res.json();
  },

  async getDeliverySlots(): Promise<DeliverySlot[]> {
    const res = await fetch(`${API_BASE_URL}/delivery-slots`);
    if (!res.ok) throw new Error('Gagal memuat slot pengiriman');
    return res.json();
  },

  async addDeliverySlot(slot: Omit<DeliverySlot, 'id'>): Promise<DeliverySlot> {
    const res = await fetch(`${API_BASE_URL}/delivery-slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
      body: JSON.stringify(slot),
    });
    if (!res.ok) throw new Error('Gagal menambah slot pengiriman');
    return res.json();
  },

  async getCouriers(): Promise<Courier[]> {
    const res = await fetch(`${API_BASE_URL}/couriers`);
    if (!res.ok) throw new Error('Gagal memuat kurir');
    return res.json();
  },

  async addCourier(courier: Omit<Courier, 'id' | 'active_orders'>): Promise<Courier> {
    const res = await fetch(`${API_BASE_URL}/couriers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
      body: JSON.stringify(courier),
    });
    if (!res.ok) throw new Error('Gagal menambah kurir');
    return res.json();
  },

  async getProducts(category?: string, search?: string): Promise<Product[]> {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (search) params.append('search', search);

    const res = await fetch(`${API_BASE_URL}/products?${params.toString()}`);
    if (!res.ok) throw new Error('Gagal memuat produk sayur');
    const products: Product[] = await res.json();
    return products.map(p => ({
      ...p,
      image_url: normalizeImageUrl(p.image_url),
    }));
  },

  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    if (!res.ok) throw new Error('Gagal membuat pesanan');
    return res.json();
  },

  async getOrder(orderId: string): Promise<Order> {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
      headers: { ...getCustomerAuthHeaders(), ...getAdminAuthHeaders() },
    });
    if (!res.ok) throw new Error('Pesanan tidak ditemukan');
    return res.json();
  },

  async adminLogin(password: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Kata sandi admin salah!' };
      }
      if (data.token && typeof window !== 'undefined') {
        localStorage.setItem('jogopawon_admin_token', data.token);
        sessionStorage.setItem('jogopawon_admin_token', data.token);
      }
      return data;
    } catch {
      return { success: false, error: 'Gagal menghubungi server backend' };
    }
  },

  async getAdminOrders(): Promise<Order[]> {
    const res = await fetch(`${API_BASE_URL}/admin/orders`, { headers: getAdminAuthHeaders() });
    if (!res.ok) throw new Error('Gagal memuat pesanan admin');
    return res.json();
  },

  async getCustomerOrders(phone?: string): Promise<Order[]> {
    const url = phone ? `${API_BASE_URL}/orders?phone=${encodeURIComponent(phone)}` : `${API_BASE_URL}/orders`;
    const res = await fetch(url, {
      headers: { ...getCustomerAuthHeaders(), ...getAdminAuthHeaders() },
    });
    if (!res.ok) throw new Error('Gagal memuat riwayat pesanan');
    return res.json();
  },

  async updateOrderStatus(orderId: string, status: string, courierName?: string, paymentStatus?: string): Promise<Order> {
    const res = await fetch(`${API_BASE_URL}/admin/orders/status/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
      body: JSON.stringify({ status, courier_name: courierName, payment_status: paymentStatus }),
    });
    if (!res.ok) throw new Error('Gagal memperbarui status');
    return res.json();
  },

  async uploadPaymentProof(orderId: string, proofUrl: string): Promise<Order> {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/proof`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getCustomerAuthHeaders(), ...getAdminAuthHeaders() },
      body: JSON.stringify({ payment_proof_url: proofUrl }),
    });
    if (!res.ok) throw new Error('Gagal mengirimkan bukti pembayaran');
    return res.json();
  },

  async cancelOrder(orderId: string): Promise<Order> {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getCustomerAuthHeaders(), ...getAdminAuthHeaders() },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal membatalkan pesanan');
    }
    return data;
  },

  async getAdminStats(): Promise<AdminStats> {
    const res = await fetch(`${API_BASE_URL}/admin/stats`, { headers: getAdminAuthHeaders() });
    if (!res.ok) throw new Error('Gagal memuat data statistik');
    return res.json();
  },

  async getProcurement(): Promise<ProcurementItem[]> {
    const res = await fetch(`${API_BASE_URL}/admin/procurement`, { headers: getAdminAuthHeaders() });
    if (!res.ok) throw new Error('Gagal memuat rekap belanja pasar');
    return res.json();
  },

  async getFinancials(): Promise<FinancialReport> {
    const res = await fetch(`${API_BASE_URL}/admin/financials`, { headers: getAdminAuthHeaders() });
    if (!res.ok) throw new Error('Gagal memuat laporan keuangan dagang');
    return res.json();
  },

  async getWaste(): Promise<WasteRecord[]> {
    const res = await fetch(`${API_BASE_URL}/admin/waste`, { headers: getAdminAuthHeaders() });
    if (!res.ok) throw new Error('Gagal memuat catatan sayur rusak');
    return res.json();
  },

  async addWaste(record: Omit<WasteRecord, 'id' | 'created_at'>): Promise<WasteRecord> {
    const res = await fetch(`${API_BASE_URL}/admin/waste`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
      body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error('Gagal mencatat sayur afkir');
    return res.json();
  },

  async simulateOrder(): Promise<Order> {
    const res = await fetch(`${API_BASE_URL}/simulate-order`, {
      method: 'POST',
      headers: getAdminAuthHeaders(),
    });
    if (!res.ok) throw new Error('Gagal menjalankan simulasi order');
    return res.json();
  },

  async updateProduct(product: Product): Promise<Product> {
    const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(product.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
      body: JSON.stringify(product),
    });
    await handleAdminResponse(res, 'Gagal mengupdate produk');
    return res.json();
  },

  async deleteProduct(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAdminAuthHeaders(),
    });
    await handleAdminResponse(res, 'Gagal menghapus produk');
  },

  async deleteOrder(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/orders/${id}`, {
      method: 'DELETE',
      headers: getAdminAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal menghapus pesanan');
    }
  },

  async bulkUpdatePrices(updates: { id: string; price: number; cost_price: number; stock?: number; variants?: any[] }[]): Promise<{ success: boolean; updated: number; message: string }> {
    const res = await fetch(`${API_BASE_URL}/products/bulk-prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
      body: JSON.stringify(updates),
    });
    await handleAdminResponse(res, 'Gagal memperbarui harga produk');
    return res.json();
  },

  async uploadImage(file: File, folder: string = 'jogopawon/products'): Promise<{ success: boolean; url: string; key: string; type?: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const headers: Record<string, string> = {};
    const adminHeaders = getAdminAuthHeaders();
    if (adminHeaders.Authorization) {
      headers.Authorization = adminHeaders.Authorization;
    } else {
      const customerHeaders = getCustomerAuthHeaders();
      if (customerHeaders.Authorization) {
        headers.Authorization = customerHeaders.Authorization;
      }
    }

    const res = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(errText || 'Gagal mengupload file ke Cloudflare R2');
    }
    const data = await res.json();
    if (data && data.url) {
      data.url = normalizeImageUrl(data.url);
    }
    return data;
  },

  async uploadMedia(file: File, folder?: string): Promise<{ success: boolean; url: string; key: string; type?: string }> {
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|3gp)$/i.test(file.name);
    const targetFolder = folder || (isVideo ? 'jogopawon/videos' : 'jogopawon/products');
    return this.uploadImage(file, targetFolder);
  },

  async addProduct(product: Omit<Product, 'id' | 'rating' | 'sold_count'>): Promise<Product> {
    const res = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
      body: JSON.stringify(product),
    });
    await handleAdminResponse(res, 'Gagal menambah produk');
    return res.json();
  },

  async getProduct(id: string): Promise<Product> {
    const res = await fetch(`${API_BASE_URL}/products/${id}`);
    if (!res.ok) throw new Error('Produk tidak ditemukan');
    return res.json();
  },

  async getProductReviews(productId: string): Promise<Review[]> {
    const res = await fetch(`${API_BASE_URL}/products/${productId}/reviews`);
    if (!res.ok) throw new Error('Gagal memuat ulasan produk');
    return res.json();
  },

  async addProductReview(productId: string, review: Partial<Review>): Promise<Review> {
    const res = await fetch(`${API_BASE_URL}/products/${productId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getCustomerAuthHeaders(),
        ...getAdminAuthHeaders(),
      },
      body: JSON.stringify(review),
    });
    if (!res.ok) throw new Error('Gagal mengirim ulasan');
    return res.json();
  },

  async loginCustomer(phone: string, password?: string): Promise<User> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.token && typeof window !== 'undefined') {
          localStorage.setItem('jogopawon_customer_token', data.token);
          sessionStorage.setItem('jogopawon_customer_token', data.token);
        }
        return data;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Nomor WhatsApp atau kata sandi salah.');
    } catch (e: any) {
      if (e?.message && e.message !== 'Failed to fetch') {
        throw e;
      }
      // offline fallback
      return {
        id: `usr_${Date.now()}`,
        name: 'Pelanggan JogoPawon',
        phone: phone,
        address: '',
        note: '',
        points: 50,
      };
    }
  },

  async registerCustomer(userData: {
    name: string;
    phone: string;
    email?: string;
    password?: string;
    address?: string;
    note?: string;
    referral_code?: string;
  }): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.token && typeof window !== 'undefined') {
        localStorage.setItem('jogopawon_customer_token', data.token);
        sessionStorage.setItem('jogopawon_customer_token', data.token);
      }
      return data;
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Gagal mendaftar akun baru.');
  },

  async getReferralInfo(phone: string): Promise<ReferralInfo> {
    const res = await fetch(`${API_BASE_URL}/user/referral?phone=${encodeURIComponent(phone)}`, {
      headers: { ...getCustomerAuthHeaders(), ...getAdminAuthHeaders() },
    });
    if (!res.ok) throw new Error('Gagal memuat info referral');
    return await res.json();
  },

  async applyReferralCode(phone: string, referralCode: string): Promise<{ success: boolean; message: string; user?: User }> {
    const res = await fetch(`${API_BASE_URL}/user/apply-referral`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getCustomerAuthHeaders(), ...getAdminAuthHeaders() },
      body: JSON.stringify({ phone, referral_code: referralCode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Kode referral tidak valid');
    }
    return data;
  },

  async getAdminUsers(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/admin/users`, { headers: getAdminAuthHeaders() });
    if (!res.ok) throw new Error('Gagal memuat data pelanggan');
    return await res.json();
  },

  async updateCustomerProfile(userData: {
    id: string;
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    landmark?: string;
    note?: string;
    avatar_url?: string;
    house_photo_url?: string;
    saved_addresses?: UserAddress[];
    old_password?: string;
    new_password?: string;
  }): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getCustomerAuthHeaders() },
      body: JSON.stringify(userData),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.token && typeof window !== 'undefined') {
        localStorage.setItem('jogopawon_customer_token', data.token);
        sessionStorage.setItem('jogopawon_customer_token', data.token);
      }
      return data;
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Gagal memperbarui profil.');
  },

  async getRewards(): Promise<RewardItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/rewards`);
      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items)) {
          return items.map((r: any) => ({
            ...r,
            image_url: normalizeImageUrl(r.image_url),
          }));
        }
      }
    } catch (e) {
      console.warn('Gagal memuat katalog hadiah:', e);
    }
    return [];
  },

  async addReward(reward: Omit<RewardItem, 'id'>): Promise<RewardItem> {
    const res = await fetch(`${API_BASE_URL}/rewards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
      body: JSON.stringify(reward),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Gagal menambah hadiah');
    }
    return await res.json();
  },

  async updateReward(reward: RewardItem): Promise<RewardItem> {
    const res = await fetch(`${API_BASE_URL}/rewards/${reward.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
      body: JSON.stringify(reward),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Gagal memperbarui hadiah');
    }
    return await res.json();
  },

  async deleteReward(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/rewards/${id}`, {
      method: 'DELETE',
      headers: getAdminAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Gagal menghapus hadiah');
    }
  },

  async redeemReward(payload: {
    reward_id: string;
    customer_phone: string;
    customer_name: string;
    delivery_option?: 'antar_subuh' | 'ambil_toko' | string;
    delivery_address?: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string; remaining_points: number; reward: RewardItem; redemption?: RewardRedemption }> {
    const res = await fetch(`${API_BASE_URL}/rewards/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getCustomerAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Gagal menukarkan poin hadiah');
    }
    return await res.json();
  },

  async getRedemptions(phone?: string): Promise<RewardRedemption[]> {
    const url = phone
      ? `${API_BASE_URL}/rewards/redemptions?phone=${encodeURIComponent(phone)}`
      : `${API_BASE_URL}/rewards/redemptions`;
    const res = await fetch(url, {
      headers: { ...getCustomerAuthHeaders(), ...getAdminAuthHeaders() },
    });
    if (!res.ok) throw new Error('Gagal memuat daftar klaim hadiah');
    return await res.json();
  },

  async updateRedemptionAction(payload: {
    id: string;
    action: 'approve' | 'ship' | 'complete' | 'reject';
    courier_name?: string;
    admin_notes?: string;
  }): Promise<{ success: boolean; message: string; redemption: RewardRedemption }> {
    const res = await fetch(`${API_BASE_URL}/rewards/redemptions/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Gagal memproses tindakan klaim hadiah');
    }
    return await res.json();
  },

  async getAccounting(): Promise<AccountingSummary> {
    const res = await fetch(`${API_BASE_URL}/admin/accounting`, { headers: getAdminAuthHeaders() });
    if (!res.ok) throw new Error('Gagal memuat data akuntansi');
    return await res.json();
  },

  async addCashTransaction(tx: Omit<CashTransaction, 'id' | 'created_at'>): Promise<CashTransaction> {
    const res = await fetch(`${API_BASE_URL}/admin/accounting/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
      body: JSON.stringify(tx),
    });
    if (!res.ok) throw new Error('Gagal mencatat transaksi kas');
    return await res.json();
  },

  async deleteCashTransaction(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/admin/accounting/transactions/${id}`, {
      method: 'DELETE',
      headers: getAdminAuthHeaders(),
    });
    if (!res.ok) throw new Error('Gagal menghapus transaksi kas');
  },

  // ==========================================
  // SCRAPER & COMMODITY RADAR
  // ==========================================
  async getScrapedPrices(params?: {
    search?: string;
    district?: string;
    platform?: string;
    supplier_type?: string;
    sort?: string;
    cheaper_only?: boolean;
    hide_anomalies?: boolean;
  }): Promise<ScrapedPriceItem[]> {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.district && params.district !== 'all') q.append('district', params.district);
    if (params?.platform && params.platform !== 'all') q.append('platform', params.platform);
    if (params?.supplier_type && params.supplier_type !== 'all') q.append('supplier_type', params.supplier_type);
    if (params?.sort) q.append('sort', params.sort);
    if (params?.cheaper_only) q.append('cheaper_only', 'true');
    if (params?.hide_anomalies !== undefined) q.append('hide_anomalies', String(params.hide_anomalies));

    const res = await fetch(`${API_BASE_URL}/scraper/items?${q.toString()}`);
    if (!res.ok) throw new Error('Gagal memuat data harga scraper');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  async getScraperSummary(): Promise<ScraperSummary> {
    const res = await fetch(`${API_BASE_URL}/scraper/summary`);
    if (!res.ok) throw new Error('Gagal memuat ringkasan scraper');
    return await res.json();
  },

  async runScraperCrawl(payload?: { commodity?: string; platform?: string }): Promise<{ success: boolean; message: string; new_items: ScrapedPriceItem[]; logs: string[] }> {
    const res = await fetch(`${API_BASE_URL}/scraper/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    if (!res.ok) throw new Error('Gagal menjalankan crawler');
    const data = await res.json();
    return {
      success: !!data?.success,
      message: data?.message || 'Crawler selesai memindai',
      new_items: Array.isArray(data?.new_items) ? data.new_items : [],
      logs: Array.isArray(data?.logs) ? data.logs : [],
    };
  },

  async applyScrapedHPP(payload: { product_id: string; scraped_item_id: string; new_hpp: number }): Promise<{ success: boolean; message: string; product: Product }> {
    const res = await fetch(`${API_BASE_URL}/scraper/apply-hpp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Gagal memperbarui HPP modal');
    return await res.json();
  },

  async addScrapedItem(item: Partial<ScrapedPriceItem>): Promise<{ success: boolean; message: string; item: ScrapedPriceItem }> {
    const res = await fetch(`${API_BASE_URL}/scraper/add-item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('Gagal menambah penawaran harga');
    return await res.json();
  },

  getScraperExportUrl(): string {
    return `${API_BASE_URL}/scraper/export`;
  },

  async subscribePush(data: { phone?: string; endpoint: string; p256dh: string; auth: string; user_agent?: string }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Gagal mendaftarkan notifikasi push');
    return await res.json();
  },

  async sendPushBroadcast(payload: { title: string; body: string; url?: string; image?: string; category?: string }): Promise<{ success: boolean; message: string; subscriber_count: number }> {
    const res = await fetch(`${API_BASE_URL}/admin/push/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal mengirim push notifikasi');
    }
    return await res.json();
  },
};

// ==========================================
// REAL-TIME WEBSOCKET LISTENER
// ==========================================

export class SayurWebSocket {
  private ws: WebSocket | null = null;
  private listeners: ((msg: WSMessage) => void)[] = [];
  private reconnectInterval: number = 3000;
  private isExplicitlyClosed: boolean = false;
  private pingIntervalId: any = null;

  constructor() {
    this.connect();

    // Pulihkan koneksi seketika saat user kembali membuka tab browser
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
            console.log('[WebSocket] Layar aktif kembali, menyambung ulang...');
            this.connect();
          }
        }
      });
      window.addEventListener('focus', () => {
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
          this.connect();
        }
      });
    }
  }

  private connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const adminTok = typeof window !== 'undefined' ? (localStorage.getItem('jogopawon_admin_token') || sessionStorage.getItem('jogopawon_admin_token')) : null;
      const custTok = typeof window !== 'undefined' ? (localStorage.getItem('jogopawon_customer_token') || sessionStorage.getItem('jogopawon_customer_token')) : null;
      const tok = adminTok || custTok;
      const wsUrl = tok ? `${WS_URL}?token=${encodeURIComponent(tok)}` : WS_URL;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Terhubung ke server realtime JogoPawon 🥬');
        clearInterval(this.pingIntervalId);
        // Kirim heartbeat berkala agar koneksi proxy/NAT tidak terputus
        this.pingIntervalId = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
              this.ws.send(JSON.stringify({ type: 'ping' }));
            } catch {}
          }
        }, 20000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WSMessage = JSON.parse(event.data);
          this.listeners.forEach((listener) => listener(data));
        } catch (e) {
          // ignore pong / non-JSON
        }
      };

      this.ws.onclose = () => {
        clearInterval(this.pingIntervalId);
        if (!this.isExplicitlyClosed) {
          setTimeout(() => this.connect(), this.reconnectInterval);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WebSocket] Warning/Offline mode:', err);
        clearInterval(this.pingIntervalId);
        this.ws?.close();
      };
    } catch (e) {
      console.warn('[WebSocket] Cannot connect:', e);
      if (!this.isExplicitlyClosed) {
        setTimeout(() => this.connect(), this.reconnectInterval);
      }
    }
  }

  reconnect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }
    this.connect();
  }

  subscribe(listener: (msg: WSMessage) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  close() {
    this.isExplicitlyClosed = true;
    this.ws?.close();
  }
}

export const realtime = new SayurWebSocket();
