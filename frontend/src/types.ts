export interface Category {
  id: string;
  name: string;
  icon: string;
  slug: string;
  description: string;
}

export interface ProductVariant {
  id: string;
  name: string;        // "1 Ons (100g)", "1/4 kg", "1/2 kg", "3/4 kg", "1 kg"
  weight_g?: number;   // 100, 250, 500, 750, 1000
  price: number;       // Harga jual varian
  cost_price: number;  // Harga modal asli varian
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: ProductVariant;
}

export interface Product {
  id: string;
  name: string;
  category_id: string;
  price: number;
  cost_price: number; // HPP / Modal kulakan
  discount_price?: number;
  unit: string;
  stock: number;
  freshness: string;
  origin: string;
  description: string;
  image_url: string;
  images?: string[];
  video_url?: string;
  videos?: string[];
  rating: number;
  sold_count: number;
  is_flash_sale: boolean;
  is_popular: boolean;
  po_batch: string; // "Panen Subuh Besok"
  variants?: ProductVariant[];
}

export interface DeliverySlot {
  id: string;
  time_range: string;
  label: string;
  max_orders: number;
  active: boolean;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id: string;
  product_name: string;
  product_image: string;
  unit: string;
  price: number;
  cost_price?: number;
  quantity: number;
  subtotal: number;
  variant_name?: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'packing' | 'shipping' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_note?: string;
  delivery_slot: string;
  delivery_date: string;
  po_date: string; // Tanggal panen/antar PO
  po_cutoff: string; // e.g. "21:00 WIB"
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total_amount: number;
  total_profit?: number; // Total laba pesanan (omzet - HPP modal kulakan)
  points_earned?: number; // 7% dari total laba/keuntungan pesanan untuk pembeli
  points_awarded?: boolean; // Poin telah terkirim setelah pembayaran lunas
  referral_code?: string; // Kode referral pengundang (misal: SITI-7890)
  referral_points_earned?: number; // 5% dari total laba pesanan untuk pengundang
  referral_awarded?: boolean; // Koin referral telah masuk ke akun pengundang
  payment_method: string;
  payment_status: string;
  payment_proof_url?: string;
  house_photo_url?: string;
  status: OrderStatus;
  courier_name?: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface ProcurementItem {
  product_id: string;
  product_name: string;
  unit: string;
  total_needed: number;
  cost_price: number;
  total_est_cost: number;
  total_revenue: number;
  est_profit: number;
}

export interface FinancialReport {
  total_revenue: number;
  total_hpp: number;
  gross_profit: number;
  profit_margin: number;
  waste_loss: number;
  net_profit: number;
  total_orders: number;
}

export interface WasteRecord {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  reason: string;
  loss_amount: number;
  date: string;
  created_at: string;
}

export interface Courier {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  active_orders: number;
}

export interface AdminStats {
  total_revenue: number;
  total_orders: number;
  pending_orders: number;
  packing_orders: number;
  shipping_orders: number;
  completed_orders: number;
  total_products: number;
  low_stock_count: number;
  total_po_count: number;
}

export interface WSMessage {
  event: 'NEW_ORDER' | 'ORDER_STATUS_UPDATED' | 'PRODUCT_UPDATED' | 'PRODUCT_DELETED' | 'SCRAPER_UPDATED' | string;
  payload: any;
}

export interface Review {
  id: string;
  product_id: string;
  user_name: string;
  user_avatar?: string;
  location: string;
  rating: number;
  comment: string;
  date: string;
  verified_buyer: boolean;
  images?: string[];
  likes: number;
}

export interface UserAddress {
  id: string;
  label: string; // "Rumah Utama", "Rumah Orang Tua", "Toko / Kantor", "Kos", etc.
  recipient_name: string;
  phone: string;
  address: string;
  landmark?: string; // Patokan rumah (e.g. "Pagar hitam depan musholla")
  house_photo_url?: string; // Foto rumah / pagar depan
  is_primary: boolean;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  landmark?: string;
  note?: string;
  avatar_url?: string;
  house_photo_url?: string;
  saved_addresses?: UserAddress[];
  points?: number; // Poin loyalitas belanja (7% dari laba belanja sendiri)
  referral_code?: string; // Kode referral unik milik akun (misal: SITI-7890)
  referred_by?: string; // Kode referral pengundang
  referral_earnings?: number; // Total koin diperoleh dari belanja teman (+5% laba)
  referral_count?: number; // Jumlah teman yang berhasil diajak
  created_at?: string;
}

export interface ReferralFriend {
  name: string;
  phone: string;
  orders_count: number;
  total_spent: number;
  coins_generated: number;
  joined_at: string;
}

export interface ReferralInfo {
  referral_code: string;
  referral_earnings: number;
  referral_count: number;
  referred_by?: string;
  invited_friends: ReferralFriend[];
  share_text: string;
  share_url: string;
}

export interface RewardItem {
  id: string;
  name: string;
  points_required: number;
  pointsCost?: number;
  category: 'Sembako' | 'Alat Rumah Tangga' | 'Elektronik' | 'Voucher' | string;
  image_url: string;
  imageUrl?: string;
  description: string;
  stock: number;
  unit?: string;
}

export type RedemptionStatus = 'pending' | 'approved' | 'shipping' | 'completed' | 'rejected';

export interface RewardRedemption {
  id: string;
  claim_number: string;
  reward_id: string;
  reward_name: string;
  reward_image: string;
  reward_category?: string;
  reward_unit?: string;
  points_spent: number;
  customer_name: string;
  customer_phone: string;
  delivery_option: 'antar_subuh' | 'ambil_toko' | string;
  delivery_address?: string;
  notes?: string;
  status: RedemptionStatus;
  courier_name?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CashTransaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  reference_id?: string;
  created_at: string;
}

export interface AccountingSummary {
  gross_sales: number;
  delivery_income: number;
  discounts: number;
  net_sales: number;
  total_cogs: number; // HPP (Modal Kulakan Pasar)
  gross_profit: number; // Laba Kotor
  operating_expenses: number; // Biaya Operasional Riil
  waste_loss: number; // Kerugian Sayur Rusak/Afkir
  points_liability: number; // Alokasi Beban Poin Reward (1% Laba)
  total_expenses: number; // Total Seluruh Biaya & Beban
  net_profit: number; // Laba Bersih
  profit_margin: number; // Margin (%)
  cash_balance: number; // Saldo Kas Toko
  total_points_issued: number;
  total_points_redeemed: number;
  transactions: CashTransaction[];
}

export type ScraperPlatform = 'facebook' | 'instagram' | 'tiktok' | 'pasar_induk' | 'petani_langsung' | 'distributor' | 'bapanas';

export interface ScrapedPriceItem {
  id: string;
  commodity_name: string;
  matched_product_id?: string;
  category: string;
  price: number;
  unit: string;
  price_per_kg: number;
  supplier_name: string;
  supplier_type: string;
  platform: ScraperPlatform;
  location: string;
  phone_wa: string;
  source_url: string;
  post_snippet: string;
  min_order: string;
  harvest_freshness: string;
  post_date: string;
  reliability_score: number;
  is_verified: boolean;
  is_anomaly_risk: boolean;
  risk_reason?: string;
  created_at: string;

  // Dinamis dihitung terhadap HPP & Harga Jual JogoPawon
  current_hpp: number;
  current_sell_price: number;
  saving_amount: number;
  saving_percent: number;
  projected_margin: number;
  deal_rating: 'BEST_DEAL' | 'CHEAPER' | 'FAIR' | 'EXPENSIVE' | 'ANOMALY';
}

export interface ScraperSummary {
  total_sources_scanned: number;
  best_deals_found: number;
  average_saving_percent: number;
  potential_daily_saving: number;
  last_crawl_time: string;
}


