import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Order,
  Product,
  Category,
  AdminStats,
  OrderStatus,
  ProcurementItem,
  FinancialReport,
  WasteRecord,
  Courier,
  AccountingSummary,
  CashTransaction,
  ProductVariant,
  RewardItem,
  RewardRedemption,
} from '../types';
import { api, realtime } from '../services/api';
import { compressImage } from '../utils/imageCompressor';
import { PriceRadarScraper } from './PriceRadarScraper';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { KgOnsProfitCalculatorModal } from './KgOnsProfitCalculatorModal';
import { groupOrdersByCluster, groupOrdersByDesa, PASURUAN_DELIVERY_CLUSTERS, ClusterOrderGroup, DesaOrderGroup, SequencedOrderItem } from '../utils/deliveryCluster';
import {
  calculateSmartPrice,
  analyzeCatalogMargins,
  generateAutoMarkupEdits,
  SmartPricingConfig,
  DEFAULT_SMART_CONFIG,
  isKgUnit,
} from '../utils/smartPricing';
import {
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  Truck,
  AlertTriangle,
  Radio,
  Plus,
  RefreshCw,
  Search,
  Database,
  Printer,
  ChevronRight,
  DollarSign,
  Layers,
  BarChart3,
  Calendar,
  Trash2,
  Play,
  Lock,
  LogOut,
  FileText,
  UserCheck,
  CheckSquare,
  Square,
  X,
  CreditCard,
  Edit,
  Save,
  MapPin,
  MessageCircle,
  UploadCloud,
  Loader2,
  Receipt,
  Coins,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Landmark,
  PieChart,
  Filter,
  Zap,
  Scale,
  SlidersHorizontal,
  Calculator,
  Percent,
  Check,
  Gift,
  ExternalLink,
  CheckCircle2,
  Banknote,
  Home,
  Copy,
  Camera,
  AlertCircle,
  Sparkles,
  Wand2,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Users,
  Phone,
  Bell,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminDashboardProps {
  orders: Order[];
  products: Product[];
  categories: Category[];
  stats: AdminStats | null;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus, courier?: string, paymentStatus?: string) => Promise<void>;
  onDeleteOrder?: (orderId: string) => Promise<void>;
  onUpdateProduct: (product: Product) => Promise<void>;
  onDeleteProduct?: (productId: string) => Promise<void>;
  onAddNewProduct: (product: Omit<Product, 'id' | 'rating' | 'sold_count'>) => Promise<void>;
  onRefreshData: () => void;
  newOrderAlert: Order | null;
  onDismissAlert: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  orders,
  products,
  categories,
  stats,
  onUpdateOrderStatus,
  onDeleteOrder,
  onUpdateProduct,
  onDeleteProduct,
  onAddNewProduct,
  onRefreshData,
  newOrderAlert,
  onDismissAlert,
}) => {
  // Authentication State (Requires both valid auth flag AND non-empty token)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const hasAuth =
      localStorage.getItem('jogopawon_admin_auth') === 'true' ||
      sessionStorage.getItem('jogopawon_admin_auth') === 'true';
    const hasToken = Boolean(
      (localStorage.getItem('jogopawon_admin_token') || sessionStorage.getItem('jogopawon_admin_token') || '').trim()
    );
    return hasAuth && hasToken;
  });
  const [pinInput, setPinInput] = useState('');

  // Auto-listen to unauthorized/expired admin session events from API client
  useEffect(() => {
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setAuthError('Sesi login admin telah berakhir. Silakan masukkan PIN pengelola kembali.');
    };
    window.addEventListener('jogopawon_admin_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('jogopawon_admin_unauthorized', handleUnauthorized);
  }, []);
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'orders' | 'procurement' | 'financials' | 'accounting' | 'products' | 'scraper' | 'rewards' | 'users'>('orders');
  const [orderFilter, setOrderFilter] = useState<string>('all');

  // Modals
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAddWasteOpen, setIsAddWasteOpen] = useState(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);
  const [selectedOrderForAddressModal, setSelectedOrderForAddressModal] = useState<Order | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Operational State
  const [procurementItems, setProcurementItems] = useState<ProcurementItem[]>([]);
  const [financials, setFinancials] = useState<FinancialReport | null>(null);
  const [accounting, setAccounting] = useState<AccountingSummary | null>(null);
  const [loadingAccounting, setLoadingAccounting] = useState<boolean>(false);
  const [wasteLogs, setWasteLogs] = useState<WasteRecord[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [checkedProcItems, setCheckedProcItems] = useState<Record<string, boolean>>({});
  const [selectedCourierMap, setSelectedCourierMap] = useState<Record<string, string>>({});
  const [orderViewMode, setOrderViewMode] = useState<'list' | 'clusters'>('list');
  const [clusterSubMode, setClusterSubMode] = useState<'desa' | 'cluster'>('desa');

  // Accounting cash transaction form state
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txCategory, setTxCategory] = useState<string>('Operasional Toko');
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txDesc, setTxDesc] = useState<string>('');
  const [txDate, setTxDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [isSubmittingTx, setIsSubmittingTx] = useState<boolean>(false);
  const [cashFilter, setCashFilter] = useState<'all' | 'income' | 'expense'>('all');

  // Daily Quick Pricing & Variant Management States
  const [catalogViewMode, setCatalogViewMode] = useState<'quick' | 'cards'>('quick');
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogCategory, setCatalogCategory] = useState<string>('all');
  const [quickPriceEdits, setQuickPriceEdits] = useState<Record<string, { price: number; cost_price: number; stock: number }>>({});
  const [isSavingPrices, setIsSavingPrices] = useState<boolean>(false);
  const [priceSaveSuccess, setPriceSaveSuccess] = useState<string | null>(null);

  // Smart Dynamic Margin & Floor Price Engine States
  const [smartConfig, setSmartConfig] = useState<SmartPricingConfig>(() => {
    try {
      const saved = localStorage.getItem('jogopawon_smart_pricing_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SMART_CONFIG;
  });
  const [isSmartConfigModalOpen, setIsSmartConfigModalOpen] = useState<boolean>(false);
  const [smartPricingFilter, setSmartPricingFilter] = useState<'all' | 'critical' | 'fair' | 'healthy'>('all');

  // Kalkulator Laba Ons ke Kg State
  const [isKgOnsModalOpen, setIsKgOnsModalOpen] = useState<boolean>(false);
  const [calculatorTargetProduct, setCalculatorTargetProduct] = useState<Product | null>(null);

  // Real-time Low Margin Alert State (Hanya untuk produk /kg yang untung < Rp 500)
  const [lowMarginAlert, setLowMarginAlert] = useState<{
    productId: string;
    productName: string;
    unit: string;
    currentProfit: number;
    suggestedPrice: number;
  } | null>(null);

  // Variant Modal State
  const [isVariantModalOpen, setIsVariantModalOpen] = useState<boolean>(false);
  const [variantTargetProduct, setVariantTargetProduct] = useState<Product | null>(null);
  const [tempVariants, setTempVariants] = useState<ProductVariant[]>([]);
  const [tempAllowCustomBudget, setTempAllowCustomBudget] = useState<boolean>(false);
  const [tempMinCustomBudget, setTempMinCustomBudget] = useState<number>(1000);
  const [isSavingVariants, setIsSavingVariants] = useState<boolean>(false);

  // Rewards Management States (Koin Pawon Hadiah)
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [rewardCategoryFilter, setRewardCategoryFilter] = useState<string>('all');
  const [rewardSearch, setRewardSearch] = useState<string>('');
  const [isRewardModalOpen, setIsRewardModalOpen] = useState<boolean>(false);
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);
  const [rewardFormName, setRewardFormName] = useState<string>('');
  const [rewardFormCategory, setRewardFormCategory] = useState<'Sembako' | 'Alat Rumah Tangga' | 'Elektronik' | 'Voucher'>('Sembako');
  const [rewardFormPoints, setRewardFormPoints] = useState<number>(100);
  const [rewardFormStock, setRewardFormStock] = useState<number>(20);
  const [rewardFormUnit, setRewardFormUnit] = useState<string>('');
  const [rewardFormImageUrl, setRewardFormImageUrl] = useState<string>('');
  const [rewardFormDesc, setRewardFormDesc] = useState<string>('');
  const [isSubmittingReward, setIsSubmittingReward] = useState<boolean>(false);
  const [rewardToast, setRewardToast] = useState<string | null>(null);
  const [isUploadingRewardImg, setIsUploadingRewardImg] = useState<boolean>(false);
  const rewardFileInputRef = useRef<HTMLInputElement>(null);

  // Redemption Claims States (Klaim Penukaran Hadiah Pelanggan)
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState<boolean>(false);
  const [rewardSubTab, setRewardSubTab] = useState<'claims' | 'catalog'>('claims');
  const [claimFilter, setClaimFilter] = useState<string>('all');
  const [claimSearch, setClaimSearch] = useState<string>('');
  const [rewardClaimAlert, setRewardClaimAlert] = useState<RewardRedemption | null>(null);
  const [selectedCourierForClaim, setSelectedCourierForClaim] = useState<Record<string, string>>({});
  const [processingClaimId, setProcessingClaimId] = useState<string | null>(null);

  // Admin Users & Loyalty Coins States
  const [customerAccounts, setCustomerAccounts] = useState<any[]>([]);
  const [loadingCustomerAccounts, setLoadingCustomerAccounts] = useState<boolean>(false);
  const [customerSearch, setCustomerSearch] = useState<string>('');

  // Push Broadcast Notification States
  const [isPushModalOpen, setIsPushModalOpen] = useState<boolean>(false);
  const [pushTitle, setPushTitle] = useState<string>('🥬 Promo Panen Subuh JogoPawon!');
  const [pushBody, setPushBody] = useState<string>('Sayur petik subuh & bumbu dapur diskon spesial hari ini. Pesan sekarang antar subuh!');
  const [pushUrl, setPushUrl] = useState<string>('/');
  const [isSendingPush, setIsSendingPush] = useState<boolean>(false);
  const [pushResultToast, setPushResultToast] = useState<{ success: boolean; message: string } | null>(null);

  // New product form
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState(categories[0]?.id || '');
  const [newProdPrice, setNewProdPrice] = useState<number>(0);
  const [newProdCost, setNewProdCost] = useState<number>(0);
  const [newProdUnit, setNewProdUnit] = useState('');
  const [newProdStock, setNewProdStock] = useState<number>(0);
  const [newProdAllowCustomBudget, setNewProdAllowCustomBudget] = useState<boolean>(false);
  const [newProdMinCustomBudget, setNewProdMinCustomBudget] = useState<number>(1000);
  const [newProdFreshness, setNewProdFreshness] = useState('Segar');
  const [newProdOrigin, setNewProdOrigin] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdImg, setNewProdImg] = useState('');
  const [newProdImages, setNewProdImages] = useState<string[]>([]);
  const [newProdVideos, setNewProdVideos] = useState<string[]>([]);
  const [isUploadingR2, setIsUploadingR2] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // New waste form
  const [wasteProdId, setWasteProdId] = useState(products[0]?.id || '');
  const [wasteQty, setWasteQty] = useState<number>(1);
  const [wasteReason, setWasteReason] = useState('');



  // Payment Verification & Proof Modal States
  const [previewImageModal, setPreviewImageModal] = useState<{
    url: string;
    title: string;
    subtitle: string;
    isHousePhoto?: boolean;
  } | null>(null);
  const [paidSuccessModalOrder, setPaidSuccessModalOrder] = useState<Order | null>(null);
  const [isAccingPaymentId, setIsAccingPaymentId] = useState<string | null>(null);

  const formatRupiah = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return 'Rp ' + Math.round(num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAccPayment = async (order: Order) => {
    setIsAccingPaymentId(order.id);
    try {
      const nextStatus = order.status === 'pending' ? 'confirmed' : order.status;
      await onUpdateOrderStatus(order.id, nextStatus, order.courier_name, 'paid');
      setPaidSuccessModalOrder({
        ...order,
        payment_status: 'paid',
        status: nextStatus,
      });
      onRefreshData();
    } catch (err: any) {
      alert('Gagal meng-ACC pembayaran: ' + (err.message || 'Error'));
    } finally {
      setIsAccingPaymentId(null);
    }
  };

  const generateStrukLunasWhatsAppUrl = (order: Order) => {
    const itemsList = (order.items || [])
      .map((it) => `• ${it.quantity}x ${it.product_name} (${it.unit}) - ${formatRupiah(it.subtotal)}`)
      .join('\n');

    const paymentLabel =
      order.payment_method === 'qris'
        ? 'QRIS ALL PAYMENT (LUNAS DIVERIFIKASI ADMIN)'
        : order.payment_method === 'cod'
        ? 'COD (BAYAR TUNAI DI TEMPAT - LUNAS)'
        : 'TRANSFER BANK (LUNAS DIVERIFIKASI ADMIN)';

    const pointsInfo =
      order.points_earned && order.points_earned > 0
        ? `\n🎁 Koin Pawon Diperoleh: +${order.points_earned} Koin (Tersimpan di Akun)`
        : '';

    const msg = `🧾 *STRUK RESMI PEMBAYARAN LUNAS - JOGOPAWON MART*
--------------------------------------------------
Status       : ✅ *LUNAS (TELAH DIVERIFIKASI ADMIN)*
No. Order    : ${order.order_number}
Tanggal Antar: ${order.po_date || 'Besok Subuh'}
Penerima     : ${order.customer_name} (${order.customer_phone})
Alamat       : ${order.delivery_address}${order.delivery_note ? `\nCatatan      : ${order.delivery_note}` : ''}

🛒 *Rincian Belanjaan:*
${itemsList}
--------------------------------------------------
Subtotal     : ${formatRupiah(order.subtotal)}
Ongkos Kirim : ${order.delivery_fee === 0 ? 'GRATIS (Promo Subuh)' : formatRupiah(order.delivery_fee)}
TOTAL LUNAS  : *${formatRupiah(order.total_amount)}*
Metode Bayar : *${paymentLabel}*${pointsInfo}
--------------------------------------------------
📦 *Jadwal Pengiriman Subuh:*
Slot Jam     : ${order.delivery_slot}
Kurir        : ${order.courier_name || 'Tim Armada Kurir Subuh JogoPawon'}

Pesanan Anda telah kami ACC dan dimasukkan ke antrean packing subuh. Sayur dan belanjaan Anda dijamin segar & bergaransi 100%!

Terima kasih atas kepercayaannya berbelanja di JogoPawon Mart. 🙏🥬`;

    const phoneClean = order.customer_phone.replace(/^0/, '62').replace(/\D/g, '');
    return `https://wa.me/${phoneClean}?text=${encodeURIComponent(msg)}`;
  };

  const handleDeleteOrderClick = async (order: Order) => {
    if (!order) return;
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus pesanan #${order.order_number} (${order.customer_name}) secara permanen? Data yang sudah dihapus tidak dapat dipulihkan.`
    );
    if (!confirmDelete) return;

    try {
      if (onDeleteOrder) {
        await onDeleteOrder(order.id);
      } else {
        await api.deleteOrder(order.id);
      }
      if (selectedOrderForAddressModal?.id === order.id || selectedOrderForAddressModal?.order_number === order.order_number) {
        setSelectedOrderForAddressModal(null);
      }
      onRefreshData();
      alert(`Pesanan #${order.order_number} berhasil dihapus secara permanen.`);
    } catch (err: any) {
      console.error('Gagal menghapus pesanan:', err);
      alert('Gagal menghapus pesanan: ' + (err.message || 'Terjadi kesalahan sistem'));
    }
  };

  const handleSetOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const targetOrder = orders.find((o) => o.id === orderId) || (selectedOrderForAddressModal?.id === orderId ? selectedOrderForAddressModal : null);
      const courier = targetOrder ? (selectedCourierMap[targetOrder.id] || targetOrder.courier_name) : undefined;
      const paymentStatus = targetOrder?.payment_status;
      await onUpdateOrderStatus(orderId, newStatus, courier, paymentStatus);
      if (selectedOrderForAddressModal?.id === orderId) {
        setSelectedOrderForAddressModal((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      onRefreshData();
    } catch (err: any) {
      alert('Gagal memperbarui status pesanan: ' + (err.message || 'Error'));
    }
  };

  const handleTogglePaymentStatus = async (order: Order) => {
    try {
      const newPayStatus = order.payment_status === 'paid' ? 'unpaid' : 'paid';
      await onUpdateOrderStatus(order.id, order.status, order.courier_name, newPayStatus);
      if (selectedOrderForAddressModal?.id === order.id) {
        setSelectedOrderForAddressModal((prev) => (prev ? { ...prev, payment_status: newPayStatus } : null));
      }
      onRefreshData();
    } catch (err: any) {
      alert('Gagal memperbarui status pembayaran: ' + (err.message || 'Error'));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const res = await api.adminLogin(pinInput);
      if (res.success) {
        setIsAuthenticated(true);
        localStorage.setItem('jogopawon_admin_auth', 'true');
        sessionStorage.setItem('jogopawon_admin_auth', 'true');
        if (res.token) {
          localStorage.setItem('jogopawon_admin_token', res.token);
          sessionStorage.setItem('jogopawon_admin_token', res.token);
        }
        setPinInput('');
      } else {
        setAuthError(res.error || 'Kata sandi pengelola salah!');
      }
    } catch {
      setAuthError('Gagal terhubung ke sistem verifikasi backend');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jogopawon_admin_auth');
    sessionStorage.removeItem('jogopawon_admin_auth');
    localStorage.removeItem('jogopawon_admin_token');
    sessionStorage.removeItem('jogopawon_admin_token');
    setIsAuthenticated(false);
    window.location.href = '/';
  };

  const loadExtraData = async () => {
    try {
      setLoadingAccounting(true);
      const [proc, fin, wst, curs, acc, rwd, rdms, custs] = await Promise.all([
        api.getProcurement().catch(() => []),
        api.getFinancials().catch(() => null),
        api.getWaste().catch(() => []),
        api.getCouriers().catch(() => []),
        api.getAccounting().catch(() => null),
        api.getRewards().catch(() => []),
        api.getRedemptions().catch(() => []),
        api.getAdminUsers().catch(() => []),
      ]);
      setProcurementItems(Array.isArray(proc) ? proc : []);
      setFinancials(fin || null);
      setWasteLogs(Array.isArray(wst) ? wst : []);
      setCouriers(Array.isArray(curs) ? curs : []);
      setAccounting(acc || null);
      setRewards(Array.isArray(rwd) ? rwd : []);
      setRedemptions(Array.isArray(rdms) ? rdms : []);
      setCustomerAccounts(Array.isArray(custs) ? custs : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAccounting(false);
    }
  };

  const loadCustomerAccountsOnly = async () => {
    setLoadingCustomerAccounts(true);
    try {
      const data = await api.getAdminUsers();
      setCustomerAccounts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCustomerAccounts(false);
    }
  };

  // Realtime WebSocket Listener untuk Klaim Hadiah Poin Konsumen
  useEffect(() => {
    const unsub = realtime.subscribe((msg) => {
      if (msg.event === 'NEW_REWARD_REDEMPTION') {
        const newClaim = msg.payload as RewardRedemption;
        if (newClaim && newClaim.id) {
          setRedemptions((prev) => [newClaim, ...prev.filter((c) => c.id !== newClaim.id)]);
          setRewardClaimAlert(newClaim);
          try {
            const chime = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            chime.play().catch(() => {});
          } catch {}
        }
      } else if (msg.event === 'REWARD_REDEMPTION_UPDATED') {
        const updatedClaim = msg.payload as RewardRedemption;
        if (updatedClaim && updatedClaim.id) {
          setRedemptions((prev) => prev.map((c) => (c.id === updatedClaim.id ? updatedClaim : c)));
        }
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadExtraData();
    }
  }, [isAuthenticated, orders, products]);

  const filteredOrders = (orders || []).filter((o) => {
    if (orderFilter === 'all') return true;
    return o.status === orderFilter;
  });

  const clusterGroups: ClusterOrderGroup[] = useMemo(() => {
    return groupOrdersByCluster(filteredOrders, PASURUAN_DELIVERY_CLUSTERS);
  }, [filteredOrders]);

  const desaGroups: DesaOrderGroup[] = useMemo(() => {
    return groupOrdersByDesa(filteredOrders);
  }, [filteredOrders]);

  const filteredRewards = (rewards || []).filter((r) => {
    const matchesCat = rewardCategoryFilter === 'all' || r.category === rewardCategoryFilter;
    const matchesSearch =
      !rewardSearch.trim() ||
      r.name.toLowerCase().includes(rewardSearch.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(rewardSearch.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const pendingClaimsCount = (redemptions || []).filter((c) => c.status === 'pending').length;

  const filteredRedemptions = (redemptions || []).filter((c) => {
    const matchesFilter = claimFilter === 'all' || c.status === claimFilter;
    const search = claimSearch.toLowerCase().trim();
    const matchesSearch =
      !search ||
      c.claim_number.toLowerCase().includes(search) ||
      c.customer_name.toLowerCase().includes(search) ||
      c.customer_phone.includes(search) ||
      c.reward_name.toLowerCase().includes(search) ||
      (c.delivery_address && c.delivery_address.toLowerCase().includes(search));
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold">PO Pending</span>;
      case 'confirmed':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-bold">PO Dikonfirmasi</span>;
      case 'packing':
        return <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-1 rounded-full font-bold">Sedang Dikemas</span>;
      case 'shipping':
        return <span className="bg-indigo-100 text-indigo-800 text-xs px-2.5 py-1 rounded-full font-bold">Diantar Kurir</span>;
      case 'completed':
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold">Terkirim Selesai</span>;
      case 'cancelled':
        return <span className="bg-rose-100 text-rose-800 text-xs px-2.5 py-1 rounded-full font-bold">PO Dibatalkan</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded-full font-bold">{status}</span>;
    }
  };

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const primaryImg = newProdImages[0] || newProdImg || '';
    const primaryVid = newProdVideos[0] || '';
    await onAddNewProduct({
      name: newProdName,
      category_id: newProdCategory,
      price: newProdPrice,
      cost_price: newProdCost,
      unit: newProdUnit,
      stock: newProdStock,
      freshness: newProdFreshness,
      origin: newProdOrigin,
      description: newProdDesc,
      image_url: primaryImg,
      images: newProdImages.length > 0 ? newProdImages : (primaryImg ? [primaryImg] : []),
      video_url: primaryVid,
      videos: newProdVideos,
      is_flash_sale: false,
      is_popular: true,
      po_batch: 'Panen Subuh Besok',
      allow_custom_budget: newProdAllowCustomBudget,
      min_custom_budget: newProdMinCustomBudget,
    });
    setIsAddProductOpen(false);
    setNewProdName('');
    setNewProdImg('');
    setNewProdImages([]);
    setNewProdVideos([]);
    setNewProdAllowCustomBudget(false);
    setNewProdMinCustomBudget(1000);
  };

  const handleMediaUpload = async (files: FileList | File[], isEdit: boolean = false) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    setIsUploadingR2(true);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploadProgressText(`Mengunggah file ${i + 1} dari ${fileArray.length}...`);

      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|3gp)$/i.test(file.name);
      const isImage = file.type.startsWith('image/');

      if (!isImage && !isVideo) {
        alert(`File "${file.name}" bukan format foto atau video yang didukung.`);
        continue;
      }

      if (file.size > 100 * 1024 * 1024) {
        alert(`File "${file.name}" melebihi batas maksimal 100MB.`);
        continue;
      }

      try {
        let fileToUpload: File = file;
        if (isImage) {
          try {
            const { file: compressed } = await compressImage(file, {
              maxWidth: 1280,
              maxHeight: 1280,
              quality: 0.85,
            });
            fileToUpload = compressed;
          } catch (compressErr) {
            console.warn('Kompresi gambar gagal, menggunakan file asli:', compressErr);
          }
        }

        const res = await api.uploadMedia(fileToUpload);
        if (res && res.url) {
          if (isEdit) {
            setEditingProduct((prev) => {
              if (!prev) return prev;
              if (isVideo) {
                const currentVideos = prev.videos && prev.videos.length > 0 ? [...prev.videos] : (prev.video_url ? [prev.video_url] : []);
                const updatedVideos = [...currentVideos, res.url];
                return {
                  ...prev,
                  video_url: updatedVideos[0] || '',
                  videos: updatedVideos,
                };
              } else {
                const currentImages = prev.images && prev.images.length > 0 ? [...prev.images] : (prev.image_url ? [prev.image_url] : []);
                const updatedImages = [...currentImages, res.url];
                return {
                  ...prev,
                  image_url: updatedImages[0] || '',
                  images: updatedImages,
                };
              }
            });
          } else {
            if (isVideo) {
              setNewProdVideos((prev) => [...prev, res.url]);
            } else {
              setNewProdImages((prev) => {
                const updated = [...prev, res.url];
                setNewProdImg(updated[0] || '');
                return updated;
              });
            }
          }
        } else {
          throw new Error('Tidak ada URL yang dikembalikan oleh Cloudflare R2');
        }
      } catch (uploadErr: any) {
        console.error('Upload failed:', uploadErr);
        alert(`Gagal mengunggah ${file.name}: ` + (uploadErr.message || 'Periksa koneksi backend'));
      }
    }

    setUploadProgressText('');
    setIsUploadingR2(false);
  };

  const handleRemoveNewMedia = (type: 'image' | 'video', index: number) => {
    if (type === 'image') {
      setNewProdImages((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        setNewProdImg(updated[0] || '');
        return updated;
      });
    } else {
      setNewProdVideos((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleRemoveEditMedia = (type: 'image' | 'video', index: number) => {
    setEditingProduct((prev) => {
      if (!prev) return prev;
      if (type === 'image') {
        const current = prev.images && prev.images.length > 0 ? prev.images : (prev.image_url ? [prev.image_url] : []);
        const updated = current.filter((_, i) => i !== index);
        return {
          ...prev,
          images: updated,
          image_url: updated[0] || '',
        };
      } else {
        const current = prev.videos && prev.videos.length > 0 ? prev.videos : (prev.video_url ? [prev.video_url] : []);
        const updated = current.filter((_, i) => i !== index);
        return {
          ...prev,
          videos: updated,
          video_url: updated[0] || '',
        };
      }
    });
  };

  const handleStartEditProduct = (prod: Product) => {
    const images = prod.images && prod.images.length > 0 ? [...prod.images] : (prod.image_url ? [prod.image_url] : []);
    const videos = prod.videos && prod.videos.length > 0 ? [...prod.videos] : (prod.video_url ? [prod.video_url] : []);
    setEditingProduct({
      ...prod,
      images,
      videos,
      image_url: images[0] || prod.image_url || '',
      video_url: videos[0] || prod.video_url || '',
    });
  };

  const handleUpdateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const primaryImg = editingProduct.images?.[0] || editingProduct.image_url || '';
      const primaryVid = editingProduct.videos?.[0] || editingProduct.video_url || '';
      const updatedVariants = recalculateProductVariants(editingProduct, editingProduct.price, editingProduct.cost_price);
      const toSave: Product = {
        ...editingProduct,
        image_url: primaryImg,
        images: editingProduct.images && editingProduct.images.length > 0 ? editingProduct.images : (primaryImg ? [primaryImg] : []),
        video_url: primaryVid,
        videos: editingProduct.videos && editingProduct.videos.length > 0 ? editingProduct.videos : (primaryVid ? [primaryVid] : []),
        variants: updatedVariants || editingProduct.variants,
      };
      await onUpdateProduct(toSave);
      setEditingProduct(null);
    } catch (err: any) {
      alert('Gagal memperbarui produk: ' + (err.message || 'Error'));
    }
  };

  // Helper functions for Daily Fast Pricing & Real-time Calculations
  const getProductPriceData = (prod: Product) => {
    const edit = quickPriceEdits[prod.id];
    return {
      price: edit?.price !== undefined ? edit.price : prod.price,
      cost_price: edit?.cost_price !== undefined ? edit.cost_price : (prod.cost_price > 0 ? prod.cost_price : Math.round(prod.price * 0.7)),
      stock: edit?.stock !== undefined ? edit.stock : prod.stock,
    };
  };

  const handlePriceFieldChange = (prodId: string, field: 'price' | 'cost_price' | 'stock', value: number) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    const current = getProductPriceData(prod);
    const updated = {
      ...current,
      [field]: value,
    };

    setQuickPriceEdits((prev) => ({
      ...prev,
      [prodId]: updated,
    }));

    // Aturan Khusus: Deteksi harga perkilonya saja yang minimal ada keuntungan 500 rupiah.
    // Jika di bawah 500 maka ada notif kemunculan harga nantinya.
    // Dan juga kalau beli yang lainnya (non-kg: ikat, pcs, pack, buah, dll) tidak dipakaikan aturan ini.
    if (isKgUnit(prod.unit)) {
      const profit = updated.price - updated.cost_price;
      const minRequired = smartConfig.defaultFloorMargin || 500;
      if (updated.cost_price > 0 && updated.price > 0 && profit < minRequired) {
        const step = smartConfig.roundingStep || 500;
        const suggested = Math.max(updated.price, Math.ceil((updated.cost_price + minRequired) / step) * step);
        setLowMarginAlert({
          productId: prod.id,
          productName: prod.name,
          unit: prod.unit,
          currentProfit: profit,
          suggestedPrice: suggested,
        });
      } else if (lowMarginAlert?.productId === prod.id) {
        setLowMarginAlert(null);
      }
    } else {
      // Non-kg product: abaikan aturan ini
      if (lowMarginAlert?.productId === prod.id) {
        setLowMarginAlert(null);
      }
    }
  };

  // Helper untuk menerapkan varian eceran dari Kalkulator Ons ke Kg
  const handleApplyRetailVariant = async (
    targetProd: Product,
    variantName: string,
    retailPrice: number,
    retailCost: number,
    retailGrams: number
  ) => {
    try {
      const currentVariants = targetProd.variants ? [...targetProd.variants] : [];
      const existingIdx = currentVariants.findIndex(
        (v) => (v.name || '').toLowerCase() === variantName.toLowerCase() || v.weight_g === retailGrams
      );

      const newVar: ProductVariant = {
        id: existingIdx >= 0 ? currentVariants[existingIdx].id : `var_${Date.now()}_${retailGrams}g`,
        name: variantName,
        unit: 'ons',
        unit_type: 'berat',
        weight_g: retailGrams,
        price: retailPrice,
        cost_price: retailCost,
      };

      if (existingIdx >= 0) {
        currentVariants[existingIdx] = newVar;
      } else {
        currentVariants.unshift(newVar);
      }

      await onUpdateProduct({
        ...targetProd,
        variants: currentVariants,
      });

      setPriceSaveSuccess(`Varian "${variantName}" (${formatRupiah(retailPrice)}) berhasil diterapkan ke ${targetProd.name}!`);
      setTimeout(() => setPriceSaveSuccess(null), 3500);
      onRefreshData();
    } catch (e: any) {
      alert('Gagal menerapkan varian: ' + (e.message || 'Error'));
    }
  };

  // Helper for generating default variant templates with smart retail markups
  const generateDefaultVariants = (
    templateType: 'bumbu' | 'sembako' | 'ikat' | 'pcs',
    basePrice: number,
    baseCost: number
  ): ProductVariant[] => {
    const effectiveCost = baseCost > 0 ? baseCost : Math.round(basePrice * 0.7);

    if (templateType === 'bumbu') {
      return [
        {
          id: `var_${Date.now()}_1ons`,
          name: '1 Ons (100g)',
          unit: 'ons',
          unit_type: 'berat',
          weight_g: 100,
          price: Math.max(500, Math.round((basePrice * 0.12) / 500) * 500),
          cost_price: Math.max(250, Math.round((effectiveCost * 0.10) / 500) * 500),
        },
        {
          id: `var_${Date.now()}_seperempat`,
          name: '1/4 kg (250g)',
          unit: 'kg',
          unit_type: 'berat',
          weight_g: 250,
          price: Math.max(1000, Math.round((basePrice * 0.28) / 500) * 500),
          cost_price: Math.max(500, Math.round((effectiveCost * 0.25) / 500) * 500),
        },
        {
          id: `var_${Date.now()}_setengah`,
          name: '1/2 kg (500g)',
          unit: 'kg',
          unit_type: 'berat',
          weight_g: 500,
          price: Math.max(1500, Math.round((basePrice * 0.52) / 500) * 500),
          cost_price: Math.max(1000, Math.round((effectiveCost * 0.50) / 500) * 500),
        },
        {
          id: `var_${Date.now()}_tigaperempat`,
          name: '3/4 kg (750g)',
          unit: 'kg',
          unit_type: 'berat',
          weight_g: 750,
          price: Math.max(2000, Math.round((basePrice * 0.77) / 500) * 500),
          cost_price: Math.max(1500, Math.round((effectiveCost * 0.75) / 500) * 500),
        },
        {
          id: `var_${Date.now()}_1kg`,
          name: '1 kg',
          unit: 'kg',
          unit_type: 'berat',
          weight_g: 1000,
          price: basePrice,
          cost_price: effectiveCost,
        },
      ];
    } else if (templateType === 'sembako') {
      return [
        {
          id: `var_${Date.now()}_setengah`,
          name: '1/2 kg',
          unit: 'kg',
          unit_type: 'berat',
          weight_g: 500,
          price: Math.max(1500, Math.round((basePrice * 0.52) / 500) * 500),
          cost_price: Math.max(1000, Math.round((effectiveCost * 0.50) / 500) * 500),
        },
        {
          id: `var_${Date.now()}_1kg`,
          name: '1 kg',
          unit: 'kg',
          unit_type: 'berat',
          weight_g: 1000,
          price: basePrice,
          cost_price: effectiveCost,
        },
        {
          id: `var_${Date.now()}_2kg`,
          name: '2 kg',
          unit: 'kg',
          unit_type: 'berat',
          weight_g: 2000,
          price: basePrice * 2,
          cost_price: effectiveCost * 2,
        },
        {
          id: `var_${Date.now()}_5kg`,
          name: '5 kg (Kemasan Karung)',
          unit: 'kg',
          unit_type: 'berat',
          weight_g: 5000,
          price: Math.max(5000, Math.round((basePrice * 4.9) / 1000) * 1000),
          cost_price: effectiveCost * 5,
        },
      ];
    } else if (templateType === 'ikat') {
      return [
        {
          id: `var_${Date.now()}_1ikat`,
          name: '1 Ikat Segar',
          unit: 'ikat',
          unit_type: 'ikat',
          weight_g: 250,
          price: basePrice,
          cost_price: effectiveCost,
        },
        {
          id: `var_${Date.now()}_2ikat`,
          name: '2 Ikat (Hemat)',
          unit: 'ikat',
          unit_type: 'ikat',
          weight_g: 500,
          price: Math.max(1000, Math.round((basePrice * 1.95) / 500) * 500),
          cost_price: effectiveCost * 2,
        },
        {
          id: `var_${Date.now()}_3ikat`,
          name: '3 Ikat (Keluarga)',
          unit: 'ikat',
          unit_type: 'ikat',
          weight_g: 750,
          price: Math.max(1500, Math.round((basePrice * 2.85) / 500) * 500),
          cost_price: effectiveCost * 3,
        },
        {
          id: `var_${Date.now()}_5ikat`,
          name: '5 Ikat (Paket Usaha/Jualan)',
          unit: 'ikat',
          unit_type: 'ikat',
          weight_g: 1250,
          price: Math.max(2500, Math.round((basePrice * 4.7) / 500) * 500),
          cost_price: effectiveCost * 5,
        },
      ];
    } else {
      return [
        {
          id: `var_${Date.now()}_1pcs`,
          name: '1 Pcs / Buah',
          unit: 'pcs',
          unit_type: 'pcs',
          price: basePrice,
          cost_price: effectiveCost,
        },
        {
          id: `var_${Date.now()}_3pcs`,
          name: '3 Pcs / Buah (Paket Masak)',
          unit: 'pcs',
          unit_type: 'pcs',
          price: Math.max(1000, Math.round((basePrice * 2.9) / 500) * 500),
          cost_price: effectiveCost * 3,
        },
        {
          id: `var_${Date.now()}_1pack`,
          name: '1 Pack / Wadah',
          unit: 'pack',
          unit_type: 'pack',
          price: Math.max(1000, Math.round((basePrice * 3.8) / 500) * 500),
          cost_price: effectiveCost * 4,
        },
      ];
    }
  };

  // Smart Variant Recalculation Engine
  const recalculateProductVariants = (
    prod: Product,
    newPrice: number,
    newCost: number,
    baseVariants?: ProductVariant[]
  ): ProductVariant[] | undefined => {
    const currentVariants = baseVariants || prod.variants;
    if (!currentVariants || currentVariants.length === 0) {
      return currentVariants;
    }

    const effectiveCost = newCost > 0 ? newCost : (prod.cost_price > 0 ? prod.cost_price : Math.round(newPrice * 0.7));

    return currentVariants.map((v) => {
      let weight = v.weight_g;
      const nameLower = (v.name || '').toLowerCase();

      // Deduce weight from name if weight_g is not set
      if (!weight) {
        if (nameLower.includes('1 ons') || nameLower.includes('100g') || nameLower.includes('100 g') || nameLower.includes('1ons')) {
          weight = 100;
        } else if (nameLower.includes('1/4') || nameLower.includes('seperempat') || nameLower.includes('250g') || nameLower.includes('250 g')) {
          weight = 250;
        } else if (nameLower.includes('1/2') || nameLower.includes('setengah') || nameLower.includes('500g') || nameLower.includes('500 g')) {
          weight = 500;
        } else if (nameLower.includes('3/4') || nameLower.includes('tigaperempat') || nameLower.includes('750g') || nameLower.includes('750 g')) {
          weight = 750;
        } else if (nameLower.includes('5 kg') || nameLower.includes('5kg') || nameLower.includes('5000g')) {
          weight = 5000;
        } else if (nameLower.includes('2 kg') || nameLower.includes('2kg') || nameLower.includes('2000g')) {
          weight = 2000;
        } else if (nameLower.includes('1 kg') || nameLower.includes('1kg') || nameLower.includes('1000g')) {
          weight = 1000;
        }
      }

      let calculatedPrice = v.price;
      let calculatedCost = v.cost_price;

      if (weight === 100) {
        calculatedPrice = Math.max(500, Math.round((newPrice * 0.12) / 500) * 500);
        calculatedCost = Math.max(250, Math.round((effectiveCost * 0.10) / 500) * 500);
      } else if (weight === 250) {
        calculatedPrice = Math.max(1000, Math.round((newPrice * 0.28) / 500) * 500);
        calculatedCost = Math.max(500, Math.round((effectiveCost * 0.25) / 500) * 500);
      } else if (weight === 500) {
        calculatedPrice = Math.max(1500, Math.round((newPrice * 0.52) / 500) * 500);
        calculatedCost = Math.max(1000, Math.round((effectiveCost * 0.50) / 500) * 500);
      } else if (weight === 750) {
        calculatedPrice = Math.max(2000, Math.round((newPrice * 0.77) / 500) * 500);
        calculatedCost = Math.max(1500, Math.round((effectiveCost * 0.75) / 500) * 500);
      } else if (weight === 1000) {
        calculatedPrice = newPrice;
        calculatedCost = effectiveCost;
      } else if (weight === 2000) {
        calculatedPrice = newPrice * 2;
        calculatedCost = effectiveCost * 2;
      } else if (weight === 5000) {
        calculatedPrice = Math.max(5000, Math.round((newPrice * 4.9) / 1000) * 1000);
        calculatedCost = effectiveCost * 5;
      } else if (weight && weight > 0) {
        const ratio = weight / 1000;
        calculatedPrice = Math.max(500, Math.round((newPrice * ratio) / 500) * 500);
        calculatedCost = Math.max(250, Math.round((effectiveCost * ratio) / 500) * 500);
      } else if (prod.price > 0 && v.price > 0) {
        const ratio = v.price / prod.price;
        calculatedPrice = Math.max(500, Math.round((newPrice * ratio) / 500) * 500);
        const costRatio = prod.cost_price > 0 ? (v.cost_price / prod.cost_price) : ratio;
        calculatedCost = Math.max(250, Math.round((effectiveCost * costRatio) / 500) * 500);
      }

      return {
        ...v,
        weight_g: weight || v.weight_g,
        price: calculatedPrice,
        cost_price: calculatedCost,
      };
    });
  };

  const handleSaveSinglePrice = async (prod: Product) => {
    const edit = quickPriceEdits[prod.id];
    if (!edit) return;
    try {
      const newPrice = edit.price;
      const newCost = edit.cost_price;
      const updatedVariants = recalculateProductVariants(prod, newPrice, newCost);
      await onUpdateProduct({
        ...prod,
        price: newPrice,
        cost_price: newCost,
        stock: edit.stock,
        variants: updatedVariants,
      });
      const variantMsg = updatedVariants && updatedVariants.length > 0
        ? ` & ${updatedVariants.length} varian berat otomatis diperbarui`
        : '';
      setPriceSaveSuccess(`Harga ${prod.name}${variantMsg} berhasil disimpan!`);
      setTimeout(() => setPriceSaveSuccess(null), 3500);
      setQuickPriceEdits((prev) => {
        const copy = { ...prev };
        delete copy[prod.id];
        return copy;
      });
      onRefreshData();
    } catch (e: any) {
      alert('Gagal menyimpan harga: ' + (e.message || 'Error'));
    }
  };

  const handleSaveAllPrices = async () => {
    const modifiedIds = Object.keys(quickPriceEdits);
    if (modifiedIds.length === 0) {
      alert('Belum ada perubahan harga yang diedit.');
      return;
    }
    setIsSavingPrices(true);
    try {
      const updates = modifiedIds.map((id) => {
        const prod = products.find((p) => p.id === id);
        const edit = quickPriceEdits[id];
        const newPrice = edit?.price ?? prod?.price ?? 0;
        const newCost = edit?.cost_price ?? prod?.cost_price ?? 0;
        const updatedVariants = prod ? recalculateProductVariants(prod, newPrice, newCost) : undefined;
        return {
          id,
          price: newPrice,
          cost_price: newCost,
          stock: edit?.stock ?? prod?.stock ?? 0,
          variants: updatedVariants,
        };
      });
      await api.bulkUpdatePrices(updates);
      onRefreshData();
      setQuickPriceEdits({});
      setPriceSaveSuccess(`Berhasil memperbarui harga harian & varian untuk ${modifiedIds.length} produk sekaligus!`);
      setTimeout(() => setPriceSaveSuccess(null), 4000);
    } catch (e: any) {
      alert('Gagal menyimpan harga masal: ' + (e.message || 'Error'));
    } finally {
      setIsSavingPrices(false);
    }
  };

  // Smart Dynamic Margin & Floor Price Engine Handlers
  const marginAnalysis = useMemo(() => {
    return analyzeCatalogMargins(products || [], quickPriceEdits, smartConfig);
  }, [products, quickPriceEdits, smartConfig]);

  const handleApplySmartMarkupAll = () => {
    const { newEdits, updatedCount, totalGain } = generateAutoMarkupEdits(products || [], quickPriceEdits, smartConfig);
    if (updatedCount === 0) {
      alert('Semua produk dengan modal pasar terisi saat ini sudah berada di batas aman keuntungan (tidak ada produk tekor).');
      return;
    }
    setQuickPriceEdits(newEdits);
    setPriceSaveSuccess(
      `⚡ Mesin Harga Pintar berhasil menaikkan ${updatedCount} produk tekor ke batas aman laba min Rp ${smartConfig.defaultFloorMargin.toLocaleString('id-ID')} + pembulatan kelipatan Rp ${smartConfig.roundingStep}! Potensi tambahan keuntungan: +Rp ${totalGain.toLocaleString('id-ID')}. Klik tombol "Simpan Semua Harga" untuk menerapkan ke katalog.`
    );
  };

  const handleApplySingleSmartMarkup = (prod: Product) => {
    const priceData = getProductPriceData(prod);
    const analysis = calculateSmartPrice(prod, priceData.cost_price, priceData.price, smartConfig);
    if (analysis.suggestedPrice <= priceData.price && !analysis.isBelowFloor) {
      alert(`Produk "${prod.name}" sudah memiliki margin yang sehat (Laba: Rp ${analysis.currentProfit.toLocaleString('id-ID')}).`);
      return;
    }
    setQuickPriceEdits((prev) => ({
      ...prev,
      [prod.id]: {
        price: analysis.suggestedPrice,
        cost_price: priceData.cost_price,
        stock: priceData.stock,
      },
    }));
    setPriceSaveSuccess(
      `⚡ Harga pintar untuk "${prod.name}" diset ke Rp ${analysis.suggestedPrice.toLocaleString('id-ID')} (Laba sehat: +Rp ${analysis.suggestedProfit.toLocaleString('id-ID')}).`
    );
    setTimeout(() => setPriceSaveSuccess(null), 3500);
  };

  const handleSaveSmartConfig = (newConfig: SmartPricingConfig) => {
    setSmartConfig(newConfig);
    try {
      localStorage.setItem('jogopawon_smart_pricing_config', JSON.stringify(newConfig));
    } catch {}
    setIsSmartConfigModalOpen(false);
    setPriceSaveSuccess('Konfigurasi Mesin Harga Pintar berhasil disimpan!');
    setTimeout(() => setPriceSaveSuccess(null), 3000);
  };

  // Variant Management Helpers
  const handleOpenVariantManager = (prod: Product) => {
    setVariantTargetProduct(prod);
    const priceData = getProductPriceData(prod);
    let initialVariants = prod.variants ? JSON.parse(JSON.stringify(prod.variants)) : [];
    if (initialVariants.length > 0) {
      initialVariants = recalculateProductVariants(prod, priceData.price, priceData.cost_price, initialVariants) || initialVariants;
    }
    setTempVariants(initialVariants);
    setTempAllowCustomBudget(Boolean(prod.allow_custom_budget));
    setTempMinCustomBudget(prod.min_custom_budget || 1000);
    setIsVariantModalOpen(true);
  };

  const handleApplyVariantTemplate = (type: 'bumbu' | 'sembako' | 'ikat' | 'pcs') => {
    if (!variantTargetProduct) return;
    const priceData = getProductPriceData(variantTargetProduct);
    const basePrice = priceData.price;
    const baseCost = priceData.cost_price;
    const generated = generateDefaultVariants(type, basePrice, baseCost);
    setTempVariants(generated);
  };

  const handleAddCustomVariant = () => {
    setTempVariants((prev) => [
      ...prev,
      {
        id: `var_${Date.now()}_custom`,
        name: 'Varian Baru (Cth: 1 Ons)',
        weight_g: 100,
        price: 5000,
        cost_price: 3500,
      },
    ]);
  };

  const handleUpdateVariantRow = (index: number, field: keyof ProductVariant, value: any) => {
    setTempVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleDeleteVariantRow = (index: number) => {
    setTempVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveVariantsSubmit = async () => {
    if (!variantTargetProduct) return;
    setIsSavingVariants(true);
    try {
      const priceData = getProductPriceData(variantTargetProduct);
      await onUpdateProduct({
        ...variantTargetProduct,
        price: priceData.price,
        cost_price: priceData.cost_price,
        stock: priceData.stock,
        variants: tempVariants,
        allow_custom_budget: tempAllowCustomBudget,
        min_custom_budget: tempMinCustomBudget,
      });
      setQuickPriceEdits((prev) => {
        const copy = { ...prev };
        delete copy[variantTargetProduct.id];
        return copy;
      });
      setIsVariantModalOpen(false);
      setPriceSaveSuccess(`Varian kelipatan untuk ${variantTargetProduct.name} berhasil disimpan!`);
      setTimeout(() => setPriceSaveSuccess(null), 3500);
      onRefreshData();
    } catch (e: any) {
      alert('Gagal menyimpan varian: ' + (e.message || 'Error'));
    } finally {
      setIsSavingVariants(false);
    }
  };

  const handleQuickAutoRecalculateVariants = async (prod: Product, templateType: 'bumbu' | 'sembako' = 'bumbu') => {
    const priceData = getProductPriceData(prod);
    const basePrice = priceData.price || 10000;
    const baseCost = priceData.cost_price || Math.round(basePrice * 0.7);

    let generated: ProductVariant[];
    if (prod.variants && prod.variants.length > 0) {
      generated = recalculateProductVariants(prod, basePrice, baseCost) || [];
    } else {
      generated = generateDefaultVariants(templateType, basePrice, baseCost);
    }

    try {
      await onUpdateProduct({
        ...prod,
        price: basePrice,
        cost_price: baseCost,
        stock: priceData.stock,
        variants: generated,
      });
      setQuickPriceEdits((prev) => {
        const copy = { ...prev };
        delete copy[prod.id];
        return copy;
      });
      setPriceSaveSuccess(`5 Varian berat timbangan untuk "${prod.name}" berhasil dihitung otomatis & disimpan!`);
      setTimeout(() => setPriceSaveSuccess(null), 3500);
      onRefreshData();
    } catch (e: any) {
      alert('Gagal kalkulasi varian: ' + (e.message || 'Error'));
    }
  };

  const handleAddWasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === wasteProdId) || products[0];
    if (!prod) return;
    const loss = (prod.cost_price || prod.price * 0.6) * wasteQty;
    await api.addWaste({
      product_id: prod.id,
      product_name: prod.name,
      quantity: wasteQty,
      unit: prod.unit,
      reason: wasteReason,
      loss_amount: loss,
      date: new Date().toISOString().split('T')[0],
    });
    setIsAddWasteOpen(false);
    loadExtraData();
  };



  const handleAddCashTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (txAmount <= 0) {
      alert('Nominal harus lebih besar dari 0!');
      return;
    }
    if (!txDesc.trim()) {
      alert('Harap isi keterangan transaksi kas!');
      return;
    }
    setIsSubmittingTx(true);
    try {
      await api.addCashTransaction({
        type: txType,
        category: txCategory,
        description: txDesc.trim(),
        amount: txAmount,
        date: txDate || new Date().toISOString().split('T')[0],
      });
      setIsAddTxOpen(false);
      setTxAmount(0);
      setTxDesc('');
      const updated = await api.getAccounting();
      setAccounting(updated);
    } catch (err: any) {
      alert('Gagal mencatat transaksi kas: ' + (err.message || 'Error'));
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const handleDeleteCashTx = async (id: string) => {
    if (!window.confirm('Hapus pencatatan kas ini? Saldo kas akan disesuaikan kembali.')) return;
    try {
      await api.deleteCashTransaction(id);
      const updated = await api.getAccounting();
      setAccounting(updated);
    } catch (err: any) {
      alert('Gagal menghapus transaksi: ' + (err.message || 'Error'));
    }
  };

  // Reward Management Handlers (Pojok Koin Pawon)
  const handleOpenAddReward = () => {
    setEditingReward(null);
    setRewardFormName('');
    setRewardFormCategory('Sembako');
    setRewardFormPoints(100);
    setRewardFormStock(20);
    setRewardFormUnit('');
    setRewardFormImageUrl('');
    setRewardFormDesc('');
    setIsRewardModalOpen(true);
  };

  const handleOpenEditReward = (item: RewardItem) => {
    setEditingReward(item);
    setRewardFormName(item.name);
    setRewardFormCategory((item.category as any) || 'Sembako');
    setRewardFormPoints(item.points_required || item.pointsCost || 100);
    setRewardFormStock(item.stock);
    setRewardFormUnit(item.unit || '');
    setRewardFormImageUrl(item.image_url || item.imageUrl || '');
    setRewardFormDesc(item.description || '');
    setIsRewardModalOpen(true);
  };

  const handleRewardFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Harap pilih file gambar (JPG, PNG, WEBP, dll.)');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert('Ukuran gambar maksimal 20MB');
      return;
    }

    setIsUploadingRewardImg(true);
    try {
      const { file: optimizedFile } = await compressImage(file, {
        maxWidth: 1000,
        maxHeight: 1000,
        quality: 0.85,
      });

      const res = await api.uploadImage(optimizedFile, 'jogopawon/rewards');
      if (res && res.url) {
        setRewardFormImageUrl(res.url);
      } else {
        throw new Error('Tidak ada URL gambar yang dikembalikan dari Cloudflare R2');
      }
    } catch (err: any) {
      console.error('R2 upload failed:', err);
      alert('Gagal mengunggah foto ke Cloudflare R2: ' + (err.message || 'Periksa koneksi backend'));
    } finally {
      setIsUploadingRewardImg(false);
    }
  };

  const handleSaveRewardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardFormName.trim()) {
      alert('Nama hadiah wajib diisi!');
      return;
    }
    if (rewardFormPoints <= 0) {
      alert('Poin penukaran harus lebih besar dari 0!');
      return;
    }

    setIsSubmittingReward(true);
    try {
      if (editingReward) {
        const updatedItem: RewardItem = {
          ...editingReward,
          name: rewardFormName.trim(),
          category: rewardFormCategory,
          points_required: Number(rewardFormPoints),
          pointsCost: Number(rewardFormPoints),
          stock: Number(rewardFormStock),
          unit: rewardFormUnit.trim(),
          image_url: rewardFormImageUrl.trim(),
          imageUrl: rewardFormImageUrl.trim(),
          description: rewardFormDesc.trim(),
        };
        const saved = await api.updateReward(updatedItem);
        setRewards((prev) => prev.map((r) => (r.id === updatedItem.id ? (saved || updatedItem) : r)));
        setRewardToast(`Hadiah "${updatedItem.name}" berhasil diperbarui!`);
      } else {
        const newItem: RewardItem = {
          id: `rew_${Date.now()}`,
          name: rewardFormName.trim(),
          category: rewardFormCategory,
          points_required: Number(rewardFormPoints),
          pointsCost: Number(rewardFormPoints),
          stock: Number(rewardFormStock),
          unit: rewardFormUnit.trim(),
          image_url: rewardFormImageUrl.trim(),
          imageUrl: rewardFormImageUrl.trim(),
          description: rewardFormDesc.trim(),
        };
        const saved = await api.addReward(newItem);
        const itemToAdd = saved || newItem;
        setRewards((prev) => [itemToAdd, ...prev.filter((r) => r.id !== itemToAdd.id)]);
        setRewardToast(`Hadiah baru "${itemToAdd.name}" berhasil ditambahkan!`);
      }
      setIsRewardModalOpen(false);
      setTimeout(() => setRewardToast(null), 3500);
    } catch (err: any) {
      alert('Gagal menyimpan hadiah: ' + (err.message || 'Error'));
    } finally {
      setIsSubmittingReward(false);
    }
  };

  const handleDeleteReward = async (id: string, name: string) => {
    if (!window.confirm(`Yakin ingin menghapus item hadiah "${name}" dari toko koin?`)) return;
    try {
      await api.deleteReward(id);
      setRewards((prev) => prev.filter((r) => r.id !== id));
      setRewardToast(`Hadiah "${name}" berhasil dihapus.`);
      setTimeout(() => setRewardToast(null), 3000);
    } catch (err: any) {
      alert('Gagal menghapus hadiah: ' + (err.message || 'Error'));
    }
  };

  // ==========================================
  // REWARD REDEMPTION ACTIONS (Tindakan Admin)
  // ==========================================
  const handleApproveClaim = async (claim: RewardRedemption) => {
    setProcessingClaimId(claim.id);
    try {
      await api.updateRedemptionAction({
        id: claim.id,
        action: 'approve',
        admin_notes: 'Disetujui admin dan sedang disiapkan',
      });
      setRedemptions((prev) =>
        prev.map((c) => (c.id === claim.id ? { ...c, status: 'approved' } : c))
      );
      setRewardToast(`✅ Klaim ${claim.claim_number} disetujui! Segera siapkan hadiah ${claim.reward_name}.`);
      setTimeout(() => setRewardToast(null), 4000);
    } catch (err: any) {
      alert('Gagal menyetujui klaim: ' + (err.message || 'Error'));
    } finally {
      setProcessingClaimId(null);
    }
  };

  const handleShipClaim = async (claim: RewardRedemption) => {
    const courier = selectedCourierForClaim[claim.id] || couriers[0]?.name || 'Kurir Subuh 1';
    setProcessingClaimId(claim.id);
    try {
      await api.updateRedemptionAction({
        id: claim.id,
        action: 'ship',
        courier_name: courier,
        admin_notes: `Ditugaskan ke ${courier}`,
      });
      setRedemptions((prev) =>
        prev.map((c) => (c.id === claim.id ? { ...c, status: 'shipping', courier_name: courier } : c))
      );
      setRewardToast(`🛵 Hadiah ${claim.reward_name} (No: ${claim.claim_number}) sedang dikirim oleh ${courier}!`);
      setTimeout(() => setRewardToast(null), 4000);
    } catch (err: any) {
      alert('Gagal memperbarui status pengiriman: ' + (err.message || 'Error'));
    } finally {
      setProcessingClaimId(null);
    }
  };

  const handleCompleteClaim = async (claim: RewardRedemption) => {
    if (!window.confirm(`Konfirmasi hadiah "${claim.reward_name}" telah diterima pelanggan ${claim.customer_name}?`)) return;
    setProcessingClaimId(claim.id);
    try {
      await api.updateRedemptionAction({
        id: claim.id,
        action: 'complete',
        admin_notes: 'Telah diserahkan dan diterima oleh pelanggan',
      });
      setRedemptions((prev) =>
        prev.map((c) => (c.id === claim.id ? { ...c, status: 'completed' } : c))
      );
      setRewardToast(`🎉 Klaim ${claim.claim_number} selesai! Hadiah telah diterima ${claim.customer_name}.`);
      setTimeout(() => setRewardToast(null), 4000);
    } catch (err: any) {
      alert('Gagal menyelesaikan klaim: ' + (err.message || 'Error'));
    } finally {
      setProcessingClaimId(null);
    }
  };

  const handleRejectClaim = async (claim: RewardRedemption) => {
    const reason = window.prompt(
      `Alasan penolakan klaim ${claim.claim_number}?\n(Poin ${claim.points_spent} akan otomatis dikembalikan 100% ke saldo pembeli)`,
      'Stok hadiah kosong / di luar jangkauan kurir'
    );
    if (reason === null) return;

    setProcessingClaimId(claim.id);
    try {
      await api.updateRedemptionAction({
        id: claim.id,
        action: 'reject',
        admin_notes: reason || 'Ditolak oleh admin',
      });
      setRedemptions((prev) =>
        prev.map((c) => (c.id === claim.id ? { ...c, status: 'rejected', admin_notes: reason } : c))
      );
      // Pulihkan stok hadiah di tampilan lokal
      setRewards((prev) =>
        prev.map((r) => (r.id === claim.reward_id ? { ...r, stock: r.stock + 1 } : r))
      );
      setRewardToast(`❌ Klaim ${claim.claim_number} ditolak. Poin ${claim.points_spent} otomatis dikembalikan ke ${claim.customer_name}.`);
      setTimeout(() => setRewardToast(null), 4500);
    } catch (err: any) {
      alert('Gagal menolak klaim: ' + (err.message || 'Error'));
    } finally {
      setProcessingClaimId(null);
    }
  };

  const getClaimWhatsAppChatUrl = (claim: RewardRedemption) => {
    const cleanPhone = claim.customer_phone.replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    const msg = `Halo Kak ${claim.customer_name}, kami dari Admin JogoPawon Mart.\n\nTerkait penukaran koin hadiah:\n📌 No. Klaim: *${claim.claim_number}*\n🎁 Hadiah: *${claim.reward_name}* (${claim.points_spent} Poin)\nStatus: *${claim.status === 'approved' ? 'Disetujui & Siap Dikirim' : claim.status === 'shipping' ? 'Sedang Diantar Kurir' : claim.status === 'completed' ? 'Selesai & Diterima' : 'Menunggu Proses'}*\n\nTerima kasih banyak sudah setia berbelanja sayur segar di JogoPawon Mart! 🙏`;
    return `https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`;
  };

  const handleDeleteProductClick = async (prod: Product) => {
    if (!prod) return;
    const confirm = window.confirm(`Apakah Anda yakin ingin menghapus produk "${prod.name}" secara permanen? Data yang sudah dihapus tidak dapat dikembalikan.`);
    if (!confirm) return;

    try {
      if (onDeleteProduct) {
        await onDeleteProduct(prod.id);
      } else {
        await api.deleteProduct(prod.id);
      }
      onRefreshData();
      alert(`Produk "${prod.name}" berhasil dihapus.`);
    } catch (err: any) {
      console.error('Gagal menghapus produk:', err);
      alert('Gagal menghapus produk: ' + (err.message || 'Terjadi kesalahan sistem'));
    }
  };

  const totalProcurementCost = (procurementItems || []).reduce((sum, item) => sum + (item.total_est_cost || 0), 0);

  // 1. LOGIN SCREEN (If not authenticated)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6 text-center border border-slate-800"
        >
          <img
            src="/logo.webp"
            alt="JogoPawon Logo"
            className="h-20 w-auto mx-auto object-contain"
          />

          <div>
            <h2 className="text-xl font-black text-slate-900">Portal Pengelola JogoPawon</h2>
            <p className="text-xs text-slate-500 mt-1">
              Area terbatas khusus pemilik & pengelola operasional sayur.
            </p>
          </div>

          {authError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type="password"
                required
                autoFocus
                placeholder="Masukkan PIN / Password Admin"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full text-center text-sm font-bold tracking-widest py-3 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-500 focus:bg-white outline-none transition-all"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black py-3 rounded-2xl shadow-lg shadow-emerald-600/25 transition-all text-xs flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Memverifikasi Kredensial...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" /> Masuk ke Console Pengelola
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // 2. MASTER ADMIN CONSOLE
  return (
    <div className="space-y-6 pb-16">
      {/* Top Admin Bar */}
      <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-md flex flex-wrap items-center justify-between gap-3 border border-slate-800">
        <div className="flex items-center gap-3">
          <img
            src="/logo.webp"
            alt="JogoPawon Logo"
            className="h-10 w-auto object-contain bg-white/90 p-1 rounded-xl shadow-xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-white">JogoPawon Master Merchant Console</span>
              <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                ADMIN UTAMA
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Sistem Kendali Operasional Pre-Order, Belanja Subuh, Gudang & Keuangan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-full border border-emerald-800">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            Go WebSocket: Connected
          </div>

          <button
            onClick={() => {
              onRefreshData();
              loadExtraData();
            }}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            title="Segarkan Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleLogout}
            className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold px-3 py-2 rounded-xl border border-rose-500/30 transition-all flex items-center gap-1.5"
            title="Kunci / Keluar Admin"
          >
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        </div>
      </div>

      {/* Realtime Alert Banner */}
      <AnimatePresence>
        {newOrderAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-r from-emerald-600 to-green-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between gap-4 border-2 border-emerald-300"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
                🔔
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm uppercase tracking-wide">
                    Pre-Order Baru Masuk Real-Time!
                  </span>
                  <span className="bg-white text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full font-mono">
                    {newOrderAlert.order_number}
                  </span>
                </div>
                <p className="text-xs text-emerald-100">
                  {newOrderAlert.customer_name} ({newOrderAlert.customer_phone}) memesan total{' '}
                  <span className="font-black text-white">{formatRupiah(newOrderAlert.total_amount)}</span> untuk panen{' '}
                  <span className="font-bold underline">{newOrderAlert.po_date || 'Besok Subuh'}</span>.
                </p>
              </div>
            </div>
            <button
              onClick={onDismissAlert}
              className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-xl font-bold transition-colors"
            >
              Lihat Pesanan
            </button>
          </motion.div>
        )}

        {/* Realtime Alert Penukaran Hadiah Poin Konsumen */}
        {rewardClaimAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between gap-4 border-2 border-amber-300"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-bounce text-xl">
                🎁
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm uppercase tracking-wide">
                    Penukaran Poin Hadiah Masuk Real-Time!
                  </span>
                  <span className="bg-white text-orange-950 text-[10px] font-black px-2 py-0.5 rounded-full font-mono">
                    {rewardClaimAlert.claim_number}
                  </span>
                </div>
                <p className="text-xs text-amber-100 mt-0.5">
                  <span className="font-bold text-white">{rewardClaimAlert.customer_name}</span> ({rewardClaimAlert.customer_phone}) menukarkan{' '}
                  <span className="font-black text-amber-200">{rewardClaimAlert.points_spent} Poin</span> untuk{' '}
                  <span className="font-bold text-white underline">{rewardClaimAlert.reward_name}</span>.
                  {rewardClaimAlert.delivery_option === 'antar_subuh' ? ' (🚚 Diantar Kurir Subuh)' : ' (🏪 Ambil di Toko)'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setActiveTab('rewards');
                  setRewardSubTab('claims');
                  setRewardClaimAlert(null);
                }}
                className="bg-white text-orange-900 hover:bg-amber-50 text-xs px-3.5 py-2 rounded-xl font-black shadow-md transition-all hover:scale-105 active:scale-95"
              >
                Lihat & Proses Klaim
              </button>
              <button
                onClick={() => setRewardClaimAlert(null)}
                className="bg-white/20 hover:bg-white/30 text-white text-xs px-2.5 py-2 rounded-xl font-bold transition-colors"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Total Omzet PO</span>
            <span className="text-lg font-black text-emerald-700">
              {formatRupiah(stats?.total_revenue || 0)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Laba Kotor Dagang</span>
            <span className="text-lg font-black text-blue-700">
              {formatRupiah(financials?.gross_profit || 0)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Perlu Dikemas</span>
            <span className="text-lg font-black text-purple-700">
              {orders.filter((o) => o.status === 'packing' || o.status === 'confirmed').length} Siap Packing
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Kerugian Sayur Rusak</span>
            <span className="text-lg font-black text-rose-600">
              {formatRupiah(financials?.waste_loss || 0)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Mobile-friendly horizontal scroll) */}
      <div className="border-b border-slate-200 pb-2">
        <div className="flex items-center overflow-x-auto no-scrollbar gap-2 text-xs py-1">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4" />
            Pesanan PO ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('procurement')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'procurement'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            🌱 Rekap Belanja Subuh ({procurementItems.length})
          </button>

          <button
            onClick={() => setActiveTab('financials')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'financials'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            💰 Keuangan & Laba Dagang
          </button>

          <button
            onClick={() => setActiveTab('accounting')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'accounting'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-4 h-4" />
            📊 Akuntansi & Buku Kas
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'products'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Katalog & Stok ({products.length})
          </button>

          <button
            onClick={() => setActiveTab('scraper')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'scraper'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Search className="w-4 h-4 text-emerald-400" />
            <span>🔍 Radar Harga & Scraper</span>
            <span className="px-1.5 py-0.5 text-[9px] bg-red-500 text-white rounded-full font-black uppercase tracking-wider animate-pulse">
              Live
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rewards')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'rewards'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>🎁 Hadiah & Klaim</span>
            {pendingClaimsCount > 0 ? (
              <span className="px-1.5 py-0.5 text-[9px] bg-amber-500 text-white rounded-full font-black animate-pulse shadow-xs">
                {pendingClaimsCount} Baru
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">({rewards.length})</span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('users');
              loadCustomerAccountsOnly();
            }}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>👥 Pelanggan & Koin ({customerAccounts.length})</span>
          </button>


        </div>
      </div>

      {/* TAB 1: ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {['all', 'pending', 'confirmed', 'packing', 'shipping', 'completed', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setOrderFilter(status)}
                className={`px-3 py-1.5 rounded-xl font-bold capitalize transition-all ${
                  orderFilter === status
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {status === 'all'
                  ? 'Semua Pesanan PO'
                  : status === 'cancelled'
                  ? 'Dibatalkan'
                  : status === 'confirmed'
                  ? 'Dikonfirmasi'
                  : status === 'packing'
                  ? 'Sedang Dikemas'
                  : status === 'shipping'
                  ? 'Sedang Dikirim'
                  : status === 'completed'
                  ? 'Selesai Terantar'
                  : status}
              </button>
            ))}
          </div>

          {/* Switch Tampilan: Satuan vs Kelompok Rute Kluster */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setOrderViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  orderViewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📋 Tampilan Daftar ({filteredOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setOrderViewMode('clusters')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  orderViewMode === 'clusters'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-blue-700 hover:bg-blue-50'
                }`}
              >
                <span>📍 Kelompok Kluster Wilayah ({clusterGroups.length} Rute)</span>
                {clusterGroups.some((g) => g.isReadyForBatchDelivery) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            </div>

            {orderViewMode === 'clusters' && (
              <div className="flex items-center gap-1.5 bg-blue-50 p-1 rounded-xl border border-blue-200">
                <button
                  type="button"
                  onClick={() => setClusterSubMode('desa')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    clusterSubMode === 'desa'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  🌾 Kelompokkan Per Desa / Kelurahan ({desaGroups.length})
                </button>
                <button
                  type="button"
                  onClick={() => setClusterSubMode('cluster')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    clusterSubMode === 'cluster'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  🏥 Kelompokkan Per Kluster / Hub ({clusterGroups.length})
                </button>
              </div>
            )}

            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <span className="text-emerald-600 font-bold">⚡ Rute Terurut Jarak (Anti-Loncat):</span>
              <span>Stop 1 ➔ Stop N urut jalan tanpa putar balik</span>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold">Tidak ada pesanan PO pada filter ini</p>
            </div>
          ) : orderViewMode === 'clusters' ? (
            /* TAMPILAN PENGELOMPOKAN WILAYAH & RUTE ANTI-LONCAT */
            <div className="space-y-4">
              {clusterSubMode === 'desa' ? (
                /* 1. VIEW PENGELOMPOKAN PER DESA / KELURAHAN */
                desaGroups.map((grp) => (
                  <div
                    key={grp.desaId}
                    className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm transition-all hover:border-emerald-400"
                  >
                    {/* Header Desa */}
                    <div className="p-4 bg-gradient-to-r from-emerald-50 via-slate-50 to-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-300">
                            🌾 Desa / Kelurahan
                          </span>
                          <h3 className="font-black text-sm text-slate-900">{grp.desaName}</h3>
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            Kec. {grp.kecamatan}
                          </span>
                          <span className="bg-emerald-600 text-white font-black text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                            <Truck className="w-3.5 h-3.5" />
                            {grp.totalOrders} Paket Siap Antar
                          </span>
                        </div>
                        <p className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                          <span>⚡ Rute Anti-Loncat: Terurut dari titik terdekat dari Gudang JogoPawon</span>
                        </p>
                      </div>

                      <div className="text-right flex items-center gap-4">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Total Nilai Paket</div>
                          <div className="font-mono font-black text-base text-emerald-700">
                            {formatRupiah(grp.totalRevenue)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const routeText = `*RUTE PENGANTARAN JOGOPAWON (ANTI-LONCAT)*\nWilayah: Desa ${grp.desaName} (Kec. ${grp.kecamatan})\nTotal: ${grp.totalOrders} Pesanan (${formatRupiah(grp.totalRevenue)})\nTitik Awal: Gudang Distribusi Subuh JogoPawon\n--------------------------------\n\n` +
                              grp.sequencedOrders.map((item) => {
                                const distNote = item.stopNumber === 1 ? `${item.distanceFromPrevKm} km dari Gudang` : `+${Math.round(item.distanceFromPrevKm * 1000)} m dari Stop #${item.stopNumber - 1}`;
                                return `[STOP #${item.stopNumber}] (${distNote})\nNo. Pesanan: ${item.order.order_number}\nPembeli    : ${item.order.customer_name} (${item.order.customer_phone})\nAlamat     : ${item.order.delivery_address}\nPatokan    : ${item.order.delivery_note || '-'}\nSlot Jam   : ${item.order.delivery_slot}\nTotal Bayar: ${formatRupiah(item.order.total_amount)}`;
                              }).join('\n\n--------------------------------\n\n');
                            navigator.clipboard.writeText(routeText);
                            alert(`✅ Daftar Rute Anti-Loncat untuk Desa ${grp.desaName} berhasil disalin ke clipboard siap dikirim ke kurir!`);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 active:scale-95"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Rute Anti-Loncat Kurir</span>
                        </button>
                      </div>
                    </div>

                    {/* Daftar Pesanan Terurut Jarak */}
                    <div className="divide-y divide-slate-100 p-2 space-y-2">
                      {grp.sequencedOrders.map((item) => (
                        <div
                          key={item.order.id}
                          onClick={() => setSelectedOrderForAddressModal(item.order)}
                          className="p-3 rounded-xl hover:bg-emerald-50/40 transition-all cursor-pointer flex flex-wrap items-center justify-between gap-3 border border-slate-100 hover:border-emerald-300"
                          title="Klik untuk lihat detail & verifikasi"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-black text-xs bg-emerald-600 text-white px-2.5 py-0.5 rounded-md shadow-2xs flex items-center gap-1">
                                <span>Stop #{item.stopNumber}</span>
                              </span>
                              <span className="text-[10px] font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-md">
                                {item.stopNumber === 1
                                  ? `📍 ${item.distanceFromPrevKm} km dari Gudang`
                                  : `⚡ +${Math.round(item.distanceFromPrevKm * 1000)} m dari Stop #${item.stopNumber - 1}`}
                              </span>
                              <span className="font-mono font-black text-xs text-slate-800">{item.order.order_number}</span>
                              {getStatusBadge(item.order.status)}
                              <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                                {item.order.delivery_slot}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-slate-900">
                              {item.order.customer_name} <span className="text-slate-500 font-normal">({item.order.customer_phone})</span>
                            </div>
                            <div className="text-xs text-slate-600 line-clamp-1 max-w-xl">
                              📍 {item.order.delivery_address} {item.order.delivery_note ? `(${item.order.delivery_note})` : ''}
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-3">
                            <div>
                              <div className="font-mono font-black text-sm text-slate-900">
                                {formatRupiah(item.order.total_amount)}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                {item.order.items?.length || 0} macam sayur
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrderForAddressModal(item.order);
                              }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold"
                            >
                              Detail
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                /* 2. VIEW PENGELOMPOKAN PER KLUSTER / HUB */
                clusterGroups.map((grp) => (
                  <div
                    key={grp.clusterId}
                    className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm transition-all hover:border-blue-400"
                  >
                    {/* Header Kluster */}
                    <div className="p-4 bg-gradient-to-r from-blue-50 via-slate-50 to-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-full border border-blue-200">
                            {grp.badge}
                          </span>
                          <h3 className="font-black text-sm text-slate-900">{grp.clusterName}</h3>
                          {grp.isReadyForBatchDelivery ? (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Siap Antar Barengan ({grp.totalOrders} Pesanan)
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs px-2.5 py-0.5 rounded-full">
                              ⏳ {grp.totalOrders}/{grp.minBatchOrders} Pesanan (Menunggu Kuota)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 flex items-center gap-1.5">
                          <span className="font-bold text-blue-800">Titik Kumpul Drop:</span>
                          <span>{grp.pickupSuggestion}</span>
                        </p>
                      </div>

                      <div className="text-right flex items-center gap-4">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Total Omzet Rute</div>
                          <div className="font-mono font-black text-base text-emerald-700">
                            {formatRupiah(grp.totalRevenue)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const routeText = `*RUTE PENGANTARAN JOGOPAWON - ${grp.clusterName} (ANTI-LONCAT)*\nTitik Drop: ${grp.pickupSuggestion}\nTotal: ${grp.totalOrders} Pesanan (${formatRupiah(grp.totalRevenue)})\n--------------------------------\n\n` +
                              (grp.sequencedOrders && grp.sequencedOrders.length > 0
                                ? grp.sequencedOrders.map((item) => {
                                    const distNote = item.stopNumber === 1 ? `${item.distanceFromPrevKm} km` : `+${Math.round(item.distanceFromPrevKm * 1000)} m`;
                                    return `[STOP #${item.stopNumber}] (${distNote})\nNo. Pesanan: ${item.order.order_number}\nPembeli    : ${item.order.customer_name} (${item.order.customer_phone})\nAlamat     : ${item.order.delivery_address}\nPatokan    : ${item.order.delivery_note || '-'}\nSlot Jam   : ${item.order.delivery_slot}\nTotal Bayar: ${formatRupiah(item.order.total_amount)}`;
                                  }).join('\n\n--------------------------------\n\n')
                                : grp.orders.map((o: any, idx: number) => `${idx + 1}. ${o.order_number} - ${o.customer_name} (${o.customer_phone})\nAlamat: ${o.delivery_address}\nCatatan: ${o.delivery_note || '-'}\nTotal: ${formatRupiah(o.total_amount)}`).join('\n\n')
                              );
                            navigator.clipboard.writeText(routeText);
                            alert(`✅ Daftar rute pengantaran kluster ${grp.clusterName} berhasil disalin ke clipboard!`);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 active:scale-95"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Rute Anti-Loncat Kurir</span>
                        </button>
                      </div>
                    </div>

                    {/* Daftar Pesanan di dalam Kluster Terurut Jarak */}
                    <div className="divide-y divide-slate-100 p-2 space-y-2">
                      {(grp.sequencedOrders && grp.sequencedOrders.length > 0 ? grp.sequencedOrders : grp.orders.map((o: any, i: number) => ({ order: o, stopNumber: i + 1, distanceFromPrevKm: 0, cumulativeDistanceKm: 0 }))).map((item: any) => (
                        <div
                          key={item.order.id}
                          onClick={() => setSelectedOrderForAddressModal(item.order)}
                          className="p-3 rounded-xl hover:bg-blue-50/40 transition-all cursor-pointer flex flex-wrap items-center justify-between gap-3 border border-slate-100 hover:border-blue-200"
                          title="Klik untuk lihat detail & verifikasi"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-black text-xs bg-blue-600 text-white px-2.5 py-0.5 rounded-md shadow-2xs">
                                Stop #{item.stopNumber}
                              </span>
                              {item.distanceFromPrevKm > 0 && (
                                <span className="text-[10px] font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-md">
                                  {item.stopNumber === 1
                                    ? `📍 ${item.distanceFromPrevKm} km`
                                    : `⚡ +${Math.round(item.distanceFromPrevKm * 1000)} m`}
                                </span>
                              )}
                              <span className="font-mono font-black text-xs text-slate-800">{item.order.order_number}</span>
                              {getStatusBadge(item.order.status)}
                              <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                                {item.order.delivery_slot}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-slate-900">
                              {item.order.customer_name} <span className="text-slate-500 font-normal">({item.order.customer_phone})</span>
                            </div>
                            <div className="text-xs text-slate-600 line-clamp-1 max-w-xl">
                              📍 {item.order.delivery_address} {item.order.delivery_note ? `(${item.order.delivery_note})` : ''}
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-3">
                            <div>
                              <div className="font-mono font-black text-sm text-slate-900">
                                {formatRupiah(item.order.total_amount)}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                {item.order.items?.length || 0} macam sayur
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrderForAddressModal(item.order);
                              }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold"
                            >
                              Detail
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrderForAddressModal(order)}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md p-4 shadow-sm space-y-3 transition-all cursor-pointer relative group"
                  title="Klik kartu pesanan untuk membuka detail lengkap, alamat rumah & verifikasi status"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-slate-900 font-mono">{order.order_number}</span>
                      {getStatusBadge(order.status)}

                      {/* Payment Status Badge */}
                      {order.payment_status === 'paid' ? (
                        <span className="text-xs bg-emerald-100 text-emerald-900 font-black px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          LUNAS ({order.payment_method.toUpperCase()})
                        </span>
                      ) : order.payment_method === 'cod' ? (
                        <span className="text-xs bg-sky-100 text-sky-900 font-bold px-2.5 py-0.5 rounded-full border border-sky-200 flex items-center gap-1">
                          <Banknote className="w-3.5 h-3.5 text-sky-700" />
                          COD (Tagih Tunai)
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-100 text-amber-950 font-black px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 animate-pulse">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          PERLU ACC ({order.payment_method.toUpperCase()})
                        </span>
                      )}

                      {/* Attached Proof Button */}
                      {order.payment_proof_url && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImageModal({
                              url: order.payment_proof_url!,
                              title: 'Bukti Pembayaran / Transfer',
                              subtitle: `Diunggah oleh ${order.customer_name} via aplikasi (${order.payment_method.toUpperCase()})`,
                              isHousePhoto: false,
                            });
                          }}
                          className="text-[11px] bg-purple-50 hover:bg-purple-100 text-purple-900 font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-purple-200 transition-colors shadow-2xs cursor-pointer"
                        >
                          📸 Bukti Transfer Terlampir ↗
                        </button>
                      )}

                      <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
                        Jadwal Panen: {order.po_date || 'Besok Subuh'} ({order.delivery_slot})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrderForAddressModal(order);
                        }}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Buka Detail Pesanan, Alamat Lengkap & Verifikasi Status"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Detail & Alamat ↗</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrderForInvoice(order);
                        }}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1 cursor-pointer"
                        title="Cetak Struk / Invoice"
                      >
                        <Printer className="w-3.5 h-3.5" /> Struk / Nota
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOrderClick(order);
                        }}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Hapus Pesanan Ini Secara Permanen"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                      </button>

                      <div className="text-right pl-2 border-l border-slate-200">
                        <span className="text-[10px] text-slate-400 block">Total ({order.payment_method.toUpperCase()})</span>
                        <span className="text-sm font-black text-emerald-700">
                          {formatRupiah(order.total_amount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold block mb-1">Tujuan Pengantaran:</span>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrderForAddressModal(order);
                        }}
                        className="bg-emerald-50/50 hover:bg-emerald-100/60 border border-emerald-200/90 hover:border-emerald-400 rounded-2xl p-3 cursor-pointer transition-all space-y-2 group shadow-2xs"
                        title="Klik untuk membuka detail alamat lengkap & foto rumah pembeli"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{order.customer_name}</span>
                            <span className="text-slate-400 font-normal">({order.customer_phone})</span>
                          </div>
                          <span className="text-[10px] font-black text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <Home className="w-3 h-3" /> Cek Alamat & Foto ↗
                          </span>
                        </div>

                        <p className="text-slate-700 text-xs line-clamp-2 leading-relaxed font-medium">
                          {order.delivery_address || 'Belum ada alamat pengantaran'}
                        </p>

                        {order.delivery_note && (
                          <p className="text-[11px] text-amber-900 bg-amber-50/90 border border-amber-200/80 px-2 py-1 rounded-lg">
                            Patokan: "{order.delivery_note}"
                          </p>
                        )}

                        {order.house_photo_url ? (
                          <div className="flex items-center gap-2 pt-1 border-t border-emerald-100">
                            <img
                              src={order.house_photo_url}
                              alt="Foto Rumah"
                              className="w-12 h-9 object-cover rounded-lg border border-emerald-300 shrink-0"
                            />
                            <div className="text-[10px] text-slate-600">
                              <span className="font-bold text-emerald-800 block">Foto Rumah Tersedia</span>
                              <span className="text-slate-400">Klik untuk melihat panduan visual kurir</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1">
                            <Camera className="w-3 h-3 text-slate-300" />
                            <span>Belum ada foto rumah pembeli</span>
                          </div>
                        )}

                        <div className="pt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrderForAddressModal(order);
                            }}
                            className="flex-1 py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-98 cursor-pointer"
                          >
                            <Home className="w-3.5 h-3.5" />
                            <span>Buka Alamat & Foto Rumah</span>
                          </button>

                          <a
                            href={`https://wa.me/${order.customer_phone.replace(/^0/, '62').replace(/\D/g, '')}?text=${encodeURIComponent(`Halo ${order.customer_name}, kami dari Admin JogoPawon Mart ingin mengonfirmasi pesanan Anda (No. Order: ${order.order_number}).`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white hover:bg-slate-100 text-emerald-700 border border-emerald-200 px-2.5 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 transition-colors shrink-0"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                            <span>Chat WA</span>
                          </a>
                        </div>
                      </div>

                      {order.courier_name && (
                        <p className="text-[11px] text-indigo-700 bg-indigo-50 px-2 py-1 rounded mt-1 font-semibold flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5" /> Kurir Bertugas: {order.courier_name}
                        </p>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block mb-1">
                        Sayur yang dipesan ({order.items?.length || 0} macam):
                      </span>
                      <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {order.items?.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span>
                              {it.quantity}x {it.product_name} ({it.unit})
                            </span>
                            <span className="font-bold text-slate-700">{formatRupiah(it.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Operational controls */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-semibold">Tugaskan Kurir:</span>
                      <select
                        value={selectedCourierMap[order.id] || order.courier_name || ''}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setSelectedCourierMap({ ...selectedCourierMap, [order.id]: e.target.value })}
                        className="text-xs p-1 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium"
                      >
                        <option value="">-- Pilih Kurir Subuh --</option>
                        {couriers.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name} ({c.vehicle})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* ACC Payment or Send Receipt Button */}
                      {order.payment_status !== 'paid' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAccPayment(order);
                          }}
                          disabled={isAccingPaymentId === order.id}
                          className={`${
                            order.payment_method === 'cod'
                              ? 'bg-sky-600 hover:bg-sky-700'
                              : 'bg-emerald-600 hover:bg-emerald-700'
                          } disabled:opacity-50 text-white text-xs font-black px-3 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer`}
                          title={`Klik untuk ACC pembayaran ${order.payment_method.toUpperCase()}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {isAccingPaymentId === order.id
                            ? 'Meng-ACC...'
                            : order.payment_method === 'cod'
                            ? 'ACC Pelunasan COD'
                            : 'ACC Pembayaran QRIS (Lunas)'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaidSuccessModalOrder(order);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                          title="Kirim Struk Lunas Resmi ke WhatsApp Pembeli"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-white" />
                          Kirim Struk Lunas WA
                        </button>
                      )}

                      {/* Status Verification Buttons */}
                      {order.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetOrderStatus(order.id, 'confirmed');
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors shadow-2xs cursor-pointer"
                          >
                            Konfirmasi PO
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetOrderStatus(order.id, 'cancelled');
                            }}
                            className="text-red-500 hover:bg-red-50 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                          >
                            Batalkan
                          </button>
                        </>
                      )}

                      {order.status === 'confirmed' && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetOrderStatus(order.id, 'packing');
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors shadow-2xs cursor-pointer"
                          >
                            Kemas & Timbang Sayur
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetOrderStatus(order.id, 'cancelled');
                            }}
                            className="text-red-500 hover:bg-red-50 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                          >
                            Batalkan
                          </button>
                        </>
                      )}

                      {order.status === 'packing' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const cur = selectedCourierMap[order.id] || couriers[0]?.name || '-';
                            onUpdateOrderStatus(order.id, 'shipping', cur);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors shadow-2xs cursor-pointer"
                        >
                          Serahkan ke Kurir Subuh
                        </button>
                      )}

                      {order.status === 'shipping' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetOrderStatus(order.id, 'completed');
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors shadow-2xs cursor-pointer"
                        >
                          Tandai Selesai / Terkirim
                        </button>
                      )}

                      {order.status === 'completed' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetOrderStatus(order.id, 'pending');
                          }}
                          className="text-slate-500 hover:bg-slate-100 text-xs font-semibold px-2 py-1 rounded-lg transition-colors cursor-pointer"
                          title="Ubah kembali status ke pending jika diperlukan"
                        >
                          Buka Kembali (Pending)
                        </button>
                      )}

                      {order.status === 'cancelled' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetOrderStatus(order.id, 'pending');
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Aktifkan Kembali (Pending)</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrderForAddressModal(order);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                      >
                        Verifikasi Lengkap ↗
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROCUREMENT / REKAP BELANJA PASAR INDUK */}
      {activeTab === 'procurement' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🌱</span>
                <h3 className="text-base font-black text-slate-900">
                  Lembar Rekap Belanja Pasar Induk & Petani (Procurement Sheet)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kalkulator otomatis kebutuhan grosir sayur subuh berdasarkan seluruh akumulasi Pre-Order (PO) pelanggan.
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors border border-emerald-200"
            >
              <Printer className="w-4 h-4" /> Cetak Lembar Belanja Subuh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center w-10">Cek</th>
                  <th className="py-3 px-3">Komoditas Sayur</th>
                  <th className="py-3 px-3 text-center">Total Kebutuhan PO</th>
                  <th className="py-3 px-3 text-right">Estimasi Modal Beli (HPP)</th>
                  <th className="py-3 px-3 text-right">Total Nilai Jual</th>
                  <th className="py-3 px-3 text-right">Potensi Keuntungan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {procurementItems.map((item, idx) => {
                  const isChecked = !!checkedProcItems[item.product_id];
                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isChecked ? 'bg-emerald-50/40 text-slate-400' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setCheckedProcItems({ ...checkedProcItems, [item.product_id]: !isChecked })}
                          className="text-emerald-700"
                        >
                          {isChecked ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                        </button>
                      </td>
                      <td className={`py-3 px-3 font-bold ${isChecked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {item.product_name}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="bg-emerald-100 text-emerald-900 font-black px-2.5 py-1 rounded-full text-xs">
                          {item.total_needed} {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-600">
                        {formatRupiah(item.total_est_cost)}
                        <span className="text-[10px] text-slate-400 block">@{formatRupiah(item.cost_price)}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700">
                        {formatRupiah(item.total_revenue)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-700">
                        +{formatRupiah(item.est_profit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <span className="text-emerald-800 font-bold block">Ringkasan Kulakan Subuh:</span>
              <p className="text-slate-600">
                Total {(procurementItems || []).reduce((sum, it) => sum + (it.total_needed || 0), 0)} item sayur harus disiapkan dari pasar induk/petani.
              </p>
            </div>
            <div className="text-right">
              <span className="text-slate-400 text-[11px] block">Estimasi Modal Kulakan:</span>
              <span className="text-base font-black text-emerald-800">{formatRupiah(totalProcurementCost)}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FINANCIALS / KEUANGAN & LABA DAGANG */}
      {activeTab === 'financials' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="text-xl">💰</span>
              <div>
                <h3 className="text-base font-black text-slate-900">Laporan Keuangan & Margin Dagang</h3>
                <p className="text-xs text-slate-500">Perhitungan real-time omzet, modal beli petani, sayur rusak, dan laba bersih.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <span className="text-[11px] text-slate-400 font-bold uppercase block">1. Total Omzet Penjualan</span>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {formatRupiah(financials?.total_revenue || 0)}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Dari {financials?.total_orders || 0} transaksi PO</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <span className="text-[11px] text-slate-400 font-bold uppercase block">2. Total HPP (Modal Kulakan)</span>
                <span className="text-xl font-black text-amber-700 mt-1 block">
                  {formatRupiah(financials?.total_hpp || 0)}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Biaya pembelian sayur ke petani / pasar</p>
              </div>

              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                <span className="text-[11px] text-emerald-700 font-bold uppercase block">3. Laba Bersih Dagang</span>
                <span className="text-xl font-black text-emerald-800 mt-1 block">
                  {formatRupiah(financials?.net_profit || 0)}
                </span>
                <p className="text-[10px] text-emerald-700 font-bold mt-1">
                  Margin: {(financials?.profit_margin || 0).toFixed(1)}% setelah afkir
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SISTEM AKUNTANSI & BUKU KAS */}
      {activeTab === 'accounting' && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-xl shadow-xs">
                📊
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  Sistem Akuntansi & Pembukuan Kas
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Standar Usaha Dagang
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Laporan Laba Rugi Komprehensif, HPP Kulakan Pasar, Liabilitas Poin Hadiah (1% Keuntungan), dan Mutasi Arus Kas Riil.
                </p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={() => setIsAddTxOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Catat Kas Masuk / Keluar
              </button>

              <button
                onClick={() => window.print()}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200"
              >
                <Printer className="w-4 h-4" />
                Cetak Laporan Keuangan
              </button>

              <button
                onClick={loadExtraData}
                disabled={loadingAccounting}
                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                title="Segarkan Pembukuan"
              >
                <RefreshCw className={`w-4 h-4 ${loadingAccounting ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* 8 Primary Accounting KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* 1. Net Sales */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Penjualan Bersih</span>
                <Receipt className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-lg font-black text-slate-900">
                {formatRupiah(accounting?.net_sales || 0)}
              </p>
              <p className="text-[10px] text-slate-400">
                Kotor: {formatRupiah(accounting?.gross_sales || 0)}
              </p>
            </div>

            {/* 2. Total COGS */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">HPP (Modal Kulakan)</span>
                <Layers className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-lg font-black text-amber-700">
                {formatRupiah(accounting?.total_cogs || 0)}
              </p>
              <p className="text-[10px] text-slate-400">
                Belanja sayur subuh di petani/pasar
              </p>
            </div>

            {/* 3. Gross Profit */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Laba Kotor Dagang</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-lg font-black text-blue-700">
                {formatRupiah(accounting?.gross_profit || 0)}
              </p>
              <p className="text-[10px] text-blue-600 font-semibold">
                Margin: {((accounting?.gross_profit || 0) / Math.max(1, (accounting?.net_sales || 0)) * 100).toFixed(1)}%
              </p>
            </div>

            {/* 4. Operating Expenses */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Beban Operasional</span>
                <ArrowDownLeft className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-lg font-black text-rose-600">
                {formatRupiah(accounting?.operating_expenses || 0)}
              </p>
              <p className="text-[10px] text-slate-400">
                Bensin, es pendingin, kemasan
              </p>
            </div>

            {/* 5. Waste Loss */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kerugian Sayur Rusak</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-lg font-black text-rose-700">
                {formatRupiah(accounting?.waste_loss || 0)}
              </p>
              <p className="text-[10px] text-slate-400">
                Susut & sayur afkir pasar
              </p>
            </div>

            {/* 6. Points Liability (1% of Profit) */}
            <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs space-y-1 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Liabilitas Poin (1% Laba)</span>
                <Coins className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-lg font-black text-amber-800">
                {formatRupiah(accounting?.points_liability || 0)}
              </p>
              <p className="text-[10px] text-amber-700 font-semibold">
                {accounting?.total_points_issued || 0} Poin terbit ({accounting?.total_points_redeemed || 0} redeem)
              </p>
            </div>

            {/* 7. Net Profit */}
            <div className="bg-white p-4 rounded-2xl border border-emerald-300 shadow-xs space-y-1 bg-gradient-to-br from-emerald-50/60 to-green-50/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Laba Bersih Usaha</span>
                <PieChart className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-lg font-black text-emerald-800">
                {formatRupiah(accounting?.net_profit || 0)}
              </p>
              <p className="text-[10px] text-emerald-700 font-bold">
                Margin Bersih: {(accounting?.profit_margin || 0).toFixed(1)}%
              </p>
            </div>

            {/* 8. Cash Balance */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldo Kas Riil Toko</span>
                <Wallet className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-lg font-black text-indigo-700">
                {formatRupiah(accounting?.cash_balance || 0)}
              </p>
              <p className="text-[10px] text-slate-400">
                Kas Masuk - Kas Keluar
              </p>
            </div>
          </div>

          {/* Section 1: Laporan Laba Rugi Komprehensif (Income Statement) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <h4 className="text-sm font-black text-slate-900 tracking-wide uppercase">
                  Laporan Laba Rugi Komprehensif (Income Statement)
                </h4>
                <p className="text-[11px] text-slate-400">
                  CV JogoPawon Subuh • Berbasis Transaksi Riil & Alokasi Liabilitas Poin
                </p>
              </div>
              <span className="text-xs bg-slate-100 font-mono font-bold text-slate-600 px-3 py-1 rounded-xl">
                Periode Berjalan
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <tbody>
                  {/* I. PENDAPATAN */}
                  <tr className="bg-slate-50">
                    <td colSpan={2} className="py-2.5 px-3 font-black text-slate-800 uppercase tracking-wider text-[11px]">
                      I. Pendapatan Usaha (Revenue)
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-6 text-slate-600">Penjualan Kotor Produk & Sayur PO</td>
                    <td className="py-2 px-4 text-right font-semibold text-slate-800">
                      {formatRupiah(accounting?.gross_sales || 0)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-6 text-slate-600">Pendapatan Jasa Pengantaran Kurir</td>
                    <td className="py-2 px-4 text-right font-semibold text-slate-800">
                      {formatRupiah(accounting?.delivery_income || 0)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-6 text-slate-600">Potongan & Diskon Belanja Pelanggan</td>
                    <td className="py-2 px-4 text-right font-semibold text-rose-600">
                      - {formatRupiah(accounting?.discounts || 0)}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50/50 border-b border-emerald-100 font-bold">
                    <td className="py-2.5 px-6 text-emerald-900">Total Pendapatan Bersih (Net Sales)</td>
                    <td className="py-2.5 px-4 text-right text-emerald-900 font-black">
                      {formatRupiah(accounting?.net_sales || 0)}
                    </td>
                  </tr>

                  {/* II. HPP */}
                  <tr className="bg-slate-50">
                    <td colSpan={2} className="py-2.5 px-3 font-black text-slate-800 uppercase tracking-wider text-[11px] pt-4">
                      II. Harga Pokok Penjualan (HPP / COGS)
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-6 text-slate-600">Modal Kulakan Pasokan Sayur & Sembako (Petani / Pasar)</td>
                    <td className="py-2 px-4 text-right font-semibold text-amber-800">
                      ({formatRupiah(accounting?.total_cogs || 0)})
                    </td>
                  </tr>
                  <tr className="bg-blue-50/50 border-b border-blue-100 font-bold">
                    <td className="py-2.5 px-6 text-blue-900">LABA KOTOR (GROSS PROFIT)</td>
                    <td className="py-2.5 px-4 text-right text-blue-900 font-black">
                      {formatRupiah(accounting?.gross_profit || 0)}
                    </td>
                  </tr>

                  {/* III. BEBAN OPERASIONAL */}
                  <tr className="bg-slate-50">
                    <td colSpan={2} className="py-2.5 px-3 font-black text-slate-800 uppercase tracking-wider text-[11px] pt-4">
                      III. Beban Usaha & Cadangan Operasional
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-6 text-slate-600">Beban Operasional Riil (Bensin Kurir, Es Batu, Kantong, Listrik)</td>
                    <td className="py-2 px-4 text-right font-semibold text-rose-600">
                      ({formatRupiah(accounting?.operating_expenses || 0)})
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2 px-6 text-slate-600">Beban Penyusutan / Sayur Afkir Rusak & Busuk</td>
                    <td className="py-2 px-4 text-right font-semibold text-rose-600">
                      ({formatRupiah(accounting?.waste_loss || 0)})
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-amber-50/30">
                    <td className="py-2 px-6 text-amber-900 font-medium">
                      Beban Program Loyalitas Hadiah (1% dari Total Keuntungan Bersih)
                    </td>
                    <td className="py-2 px-4 text-right font-semibold text-amber-800">
                      ({formatRupiah(accounting?.points_liability || 0)})
                    </td>
                  </tr>
                  <tr className="bg-rose-50/40 border-b border-rose-100 font-bold">
                    <td className="py-2.5 px-6 text-rose-900">Total Beban Usaha & Cadangan</td>
                    <td className="py-2.5 px-4 text-right text-rose-900 font-black">
                      ({formatRupiah(accounting?.total_expenses || 0)})
                    </td>
                  </tr>

                  {/* IV. LABA BERSIH */}
                  <tr className="bg-emerald-600 text-white font-black text-sm">
                    <td className="py-3 px-6 rounded-l-2xl">
                      LABA BERSIH TAHUN / PERIODE BERJALAN (NET PROFIT)
                    </td>
                    <td className="py-3 px-4 text-right rounded-r-2xl text-base font-black">
                      {formatRupiah(accounting?.net_profit || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 px-2 border-t border-slate-100">
              <span>* Rasio Margin Laba Bersih Usaha: <strong className="text-emerald-700">{(accounting?.profit_margin || 0).toFixed(2)}%</strong></span>
              <span className="text-[11px] text-slate-400">Diperbarui otomatis saat setiap PO diselesaikan atau kas dicatat</span>
            </div>
          </div>

          {/* Section 2: Loyalty Points Rule & Liability Analysis */}
          <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50 rounded-3xl p-6 border border-amber-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-amber-200/60 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-xs">
                🪙
              </div>
              <div>
                <h4 className="text-sm font-black text-amber-950">
                  Analisis & Liabilitas Program Poin Hadiah Sembako
                </h4>
                <p className="text-xs text-amber-800/80">
                  Aturan Resmi: 1 Poin didapat dari setiap keuntungan Rp 100 (1% Keuntungan Bersih PO, Bukan dari Harga Asli Produk).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
              <div className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Poin Diterbitkan</span>
                <span className="text-lg font-black text-amber-900 mt-1 block">
                  {accounting?.total_points_issued || 0} Poin
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">Diberikan ke pelanggan dari PO</p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Poin Telah Ditukarkan</span>
                <span className="text-lg font-black text-emerald-800 mt-1 block">
                  {accounting?.total_points_redeemed || 0} Poin
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">Ditukar sembako / bumbu / sayur</p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-blue-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Poin Beredar (Outstanding)</span>
                <span className="text-lg font-black text-blue-900 mt-1 block">
                  {(accounting?.total_points_issued || 0) - (accounting?.total_points_redeemed || 0)} Poin
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">Masih disimpan dompet konsumen</p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-purple-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Cadangan Kas Hadiah (1%)</span>
                <span className="text-lg font-black text-purple-900 mt-1 block">
                  {formatRupiah(accounting?.points_liability || 0)}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">Disisihkan dari laba bersih</p>
              </div>
            </div>

            <div className="bg-amber-100/60 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2">
              <span className="text-base">💡</span>
              <p className="leading-relaxed">
                <strong>Simulasi Keuntungan:</strong> Jika modal beras Rp 15.000 dan dijual Rp 16.000, keuntungan adalah Rp 1.000. 
                Poin yang diperoleh konsumen adalah <strong>1% dari Rp 1.000 = 10 Poin</strong> (Rp 10 cadangan sembako). 
                Harga modal pokok Rp 15.000 Anda tetap 100% aman dan tidak terpotong sama sekali!
              </p>
            </div>
          </div>

          {/* Section 3: Buku Kas & Jurnal Mutasi Arus Kas (Cash Flow Ledger) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-3">
              <div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  Buku Kas & Jurnal Mutasi Kas Riil
                </h4>
                <p className="text-xs text-slate-400">
                  Pencatatan kas masuk dari pesanan PO & pengeluaran operasional toko subuh.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setCashFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    cashFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua ({accounting?.transactions?.length || 0})
                </button>
                <button
                  onClick={() => setCashFilter('income')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    cashFilter === 'income'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Kas Masuk
                </button>
                <button
                  onClick={() => setCashFilter('expense')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    cashFilter === 'expense'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  Kas Keluar
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Tanggal</th>
                    <th className="py-3 px-3">Tipe Mutasi</th>
                    <th className="py-3 px-3">Kategori</th>
                    <th className="py-3 px-3">Keterangan / Uraian</th>
                    <th className="py-3 px-3 text-right">Nominal (Rp)</th>
                    <th className="py-3 px-3 text-center w-16">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!accounting?.transactions || accounting.transactions.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Belum ada riwayat transaksi kas tercatat. Klik tombol <strong>+ Catat Kas Masuk / Keluar</strong> di atas.
                      </td>
                    </tr>
                  ) : (
                    accounting.transactions
                      .filter((tx) => cashFilter === 'all' || tx.type === cashFilter)
                      .map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                            {tx.date}
                          </td>
                          <td className="py-3 px-3">
                            {tx.type === 'income' ? (
                              <span className="bg-emerald-100 text-emerald-800 font-black text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                                <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                                Kas Masuk
                              </span>
                            ) : (
                              <span className="bg-rose-100 text-rose-800 font-black text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                                <ArrowDownLeft className="w-3 h-3 text-rose-600" />
                                Kas Keluar
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-700">
                            {tx.category}
                          </td>
                          <td className="py-3 px-3 text-slate-800 font-medium max-w-xs truncate">
                            {tx.description}
                          </td>
                          <td className={`py-3 px-3 text-right font-black ${
                            tx.type === 'income' ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            {tx.type === 'income' ? '+' : '-'} {formatRupiah(tx.amount)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleDeleteCashTx(tx.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Hapus pencatatan kas ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">
                    Total Pemasukan: <strong className="text-emerald-700">
                      {formatRupiah(
                        (accounting?.transactions || [])
                          .filter((t) => t.type === 'income')
                          .reduce((sum, t) => sum + (t.amount || 0), 0)
                      )}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-slate-600">
                    Total Pengeluaran: <strong className="text-rose-600">
                      {formatRupiah(
                        (accounting?.transactions || [])
                          .filter((t) => t.type === 'expense')
                          .reduce((sum, t) => sum + (t.amount || 0), 0)
                      )}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-slate-400 text-[10px] block font-bold uppercase">Saldo Kas Toko Saat Ini:</span>
                <span className="text-base font-black text-indigo-800">
                  {formatRupiah(accounting?.cash_balance || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PRODUCTS / KATALOG & UPDATE HARGA HARIAN */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Top Bar: Mode Switcher & Quick Save */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🥬</span>
                <h3 className="text-base font-black text-slate-900">
                  Katalog & Pengaturan Harga Harian Subuh
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sesuaikan harga modal beli pasar dan harga jual harian. Keuntungan toko & 1% poin pelanggan dihitung real-time.
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setCatalogViewMode('quick')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                    catalogViewMode === 'quick'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Mode Cepat (Tabel Harian)
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogViewMode('cards')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                    catalogViewMode === 'cards'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  Mode Kartu
                </button>
              </div>

              {/* Save All Modified Prices Button */}
              {Object.keys(quickPriceEdits).length > 0 && (
                <button
                  type="button"
                  disabled={isSavingPrices}
                  onClick={handleSaveAllPrices}
                  className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-md shadow-emerald-600/30 transition-all animate-bounce-short"
                >
                  <Save className="w-4 h-4" />
                  Simpan Semua Harga ({Object.keys(quickPriceEdits).length})
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsAddProductOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Tambah Produk
              </button>
            </div>
          </div>

          {/* Success Notification Alert */}
          <AnimatePresence>
            {priceSaveSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-emerald-600 text-white p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Check className="w-4 h-4 bg-white/20 p-0.5 rounded-full" />
                  {priceSaveSuccess}
                </div>
                <button
                  type="button"
                  onClick={() => setPriceSaveSuccess(null)}
                  className="text-white/80 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search & Category Filter Bar */}
          <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama sayur, bumbu, beras, buah..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white"
              />
              {catalogSearch && (
                <button
                  type="button"
                  onClick={() => setCatalogSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
              <button
                type="button"
                onClick={() => setCatalogCategory('all')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                  catalogCategory === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({products.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCatalogCategory(c.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                    catalogCategory === c.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* MODE 1: ULTRA-FAST DAILY PRICING TABLE WITH SMART PRICING ENGINE */}
          {catalogViewMode === 'quick' ? (
            <div className="space-y-4">
              {/* SMART PRICING ENGINE CONTROL BANNER */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-5 shadow-xl border border-emerald-800/60 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black shadow-lg shadow-emerald-500/25 shrink-0">
                      <Wand2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-black text-white">
                          Mesin Harga Pintar & Proteksi Keuntungan
                        </h3>
                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-300" /> Auto-Floor Min Rp {smartConfig.defaultFloorMargin.toLocaleString('id-ID')}
                        </span>
                        <span className="bg-teal-500/20 text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-500/30">
                          Rounding Kelipatan Rp {smartConfig.roundingStep}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">
                        Sistem otomatis menghitung susut sayur {smartConfig.includeShrinkage ? 'aktif (5-8%)' : 'nonaktif'}, biaya kemas plastik seal {smartConfig.includePackagingCost ? '(Rp 250)' : '(Rp 0)'}, dan membulatkan harga ke atas agar bebas uang receh di pembeli.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setCalculatorTargetProduct(null);
                        setIsKgOnsModalOpen(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                      title="Kalkulator Konversi Laba Eceran (1 Ons ke 1 Kg)"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>🧮 Kalkulator Laba Ons ke Kg</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsSmartConfigModalOpen(true)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Atur parameter ambang batas laba & pembulatan"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>Atur Rumus Pintar</span>
                    </button>

                    <button
                      type="button"
                      disabled={marginAnalysis.criticalCount === 0 || isSavingPrices}
                      onClick={handleApplySmartMarkupAll}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 text-slate-950 text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
                      title="Otomatis naikkan semua produk kiloan yang untungnya di bawah Rp 500 & bulatkan ke atas"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Auto-Markup Semua ({marginAnalysis.criticalCount} Produk Tekor)</span>
                    </button>
                  </div>
                </div>

                {/* KPI Cards / Filter Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div
                    onClick={() => setSmartPricingFilter(smartPricingFilter === 'critical' ? 'all' : 'critical')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      smartPricingFilter === 'critical'
                        ? 'bg-rose-950/80 border-rose-500 ring-2 ring-rose-500'
                        : 'bg-slate-800/70 border-slate-700/80 hover:border-rose-500/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">Kiloan Tekor (&lt; Rp 500)</span>
                      {marginAnalysis.criticalCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
                    </div>
                    <span className="text-xl font-black text-rose-400 block mt-1">
                      {marginAnalysis.criticalCount} Produk
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Hanya Satuan Kg (Min Untung Rp 500)
                    </span>
                  </div>

                  <div
                    onClick={() => setSmartPricingFilter(smartPricingFilter === 'fair' ? 'all' : 'fair')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      smartPricingFilter === 'fair'
                        ? 'bg-amber-950/80 border-amber-500 ring-2 ring-amber-500'
                        : 'bg-slate-800/70 border-slate-700/80 hover:border-amber-500/60'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">Margin Pas</span>
                    <span className="text-xl font-black text-amber-400 block mt-1">
                      {marginAnalysis.fairCount} Produk
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Laba Rp {smartConfig.defaultFloorMargin.toLocaleString('id-ID')} - Rp 999
                    </span>
                  </div>

                  <div
                    onClick={() => setSmartPricingFilter(smartPricingFilter === 'healthy' ? 'all' : 'healthy')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      smartPricingFilter === 'healthy'
                        ? 'bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-500'
                        : 'bg-slate-800/70 border-slate-700/80 hover:border-emerald-500/60'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">Margin Sehat</span>
                    <span className="text-xl font-black text-emerald-400 block mt-1">
                      {marginAnalysis.healthyCount} Produk
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Laba &ge; Rp 1.000 / item
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl border bg-slate-800/70 border-slate-700/80">
                    <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block">Potensi Tambahan Laba</span>
                    <span className="text-xl font-black text-teal-300 block mt-1">
                      +{formatRupiah(marginAnalysis.totalPotentialGain)}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Jika semua produk tekor dimarkup
                    </span>
                  </div>
                </div>

                {smartPricingFilter !== 'all' && (
                  <div className="flex items-center justify-between text-xs bg-slate-800/90 px-3.5 py-2 rounded-xl border border-slate-700">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Menampilkan: <strong className="text-white uppercase">{smartPricingFilter === 'critical' ? 'Hanya Produk Tekor (Butuh Markup)' : smartPricingFilter === 'fair' ? 'Hanya Produk Margin Pas' : 'Hanya Produk Margin Sehat'}</strong></span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSmartPricingFilter('all')}
                      className="text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer text-xs"
                    >
                      Tampilkan Semua Produk
                    </button>
                  </div>
                )}

                {/* NOTIFIKASI KEMUNCULAN HARGA (JIKA LABA KILOAN < RP 500) */}
                {lowMarginAlert && (
                  <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-amber-950 border-2 border-rose-500 p-3.5 rounded-2xl shadow-xl flex items-center justify-between flex-wrap gap-3 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">
                            ⚠️ NOTIFIKASI HARGA: Keuntungan Kiloan di Bawah Rp 500!
                          </span>
                          <span className="text-[10px] bg-rose-500 text-white font-bold px-2 py-0.2 rounded-md">
                            Satuan: /{lowMarginAlert.unit}
                          </span>
                        </div>
                        <p className="text-[11px] text-rose-200 mt-0.5">
                          Produk <strong>{lowMarginAlert.productName}</strong> keuntungannya saat ini hanya{' '}
                          <strong className="text-white underline">{formatRupiah(lowMarginAlert.currentProfit)}</strong> / kg. Batas minimal laba kiloan adalah{' '}
                          <strong>Rp 500</strong>. Disarankan menaikkan harga menjadi{' '}
                          <strong className="text-emerald-300">{formatRupiah(lowMarginAlert.suggestedPrice)}</strong>.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          handlePriceFieldChange(lowMarginAlert.productId, 'price', lowMarginAlert.suggestedPrice);
                          setLowMarginAlert(null);
                        }}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black px-3.5 py-1.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Terapkan Rp {lowMarginAlert.suggestedPrice.toLocaleString('id-ID')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLowMarginAlert(null)}
                        className="p-1.5 text-rose-300 hover:text-white rounded-lg hover:bg-rose-800/50 cursor-pointer"
                        title="Tutup notifikasi"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* TABLE CONTAINER */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden space-y-2">
                <div className="bg-amber-50/70 border-b border-amber-200/80 p-3 px-4 flex items-center justify-between text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚡</span>
                    <span>
                      <strong>Tips Subuh:</strong> Masukkan modal beli kulakan pasar di kolom <strong>Modal HPP</strong>. Jika laba di bawah Rp {smartConfig.defaultFloorMargin.toLocaleString('id-ID')}, tombol <strong>Saran Pintar</strong> akan menyala otomatis!
                    </span>
                  </div>
                  {Object.keys(quickPriceEdits).length > 0 && (
                    <span className="bg-amber-500 text-white font-black px-2.5 py-0.5 rounded-full text-[11px] shrink-0 animate-bounce-short">
                      {Object.keys(quickPriceEdits).length} Harga Diubah (Belum Disimpan)
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3 w-12 text-center">Foto</th>
                        <th className="py-3 px-3 min-w-[180px]">Nama Produk & Satuan</th>
                        <th className="py-3 px-3 min-w-[170px] w-44">Modal HPP (Beli Pasar)</th>
                        <th className="py-3 px-3 min-w-[170px] w-44">Harga Jual Pelanggan</th>
                        <th className="py-3 px-3 w-36 text-center">Keuntungan (Laba Bersih)</th>
                        <th className="py-3 px-3 w-32 text-center">1% Poin Pelanggan</th>
                        <th className="py-3 px-3 w-28 text-center">Stok Ready</th>
                        <th className="py-3 px-3 w-36 text-center">Kelola Varian Berat</th>
                        <th className="py-3 px-3 w-28 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(products || [])
                        .filter((p) => {
                          const matchCat = catalogCategory === 'all' || p.category_id === catalogCategory;
                          const matchQ =
                            !catalogSearch ||
                            p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                            p.origin?.toLowerCase().includes(catalogSearch.toLowerCase());
                          if (!matchCat || !matchQ) return false;

                          if (smartPricingFilter !== 'all') {
                            const priceData = getProductPriceData(p);
                            const res = calculateSmartPrice(p, priceData.cost_price, priceData.price, smartConfig);
                            if (smartPricingFilter === 'critical') return res.isBelowFloor;
                            if (smartPricingFilter === 'fair') return !res.isBelowFloor && res.currentProfit < 1000 && priceData.cost_price > 0;
                            if (smartPricingFilter === 'healthy') return !res.isBelowFloor && res.currentProfit >= 1000;
                          }
                          return true;
                        })
                        .map((prod) => {
                          const priceData = getProductPriceData(prod);
                          const isModified = !!quickPriceEdits[prod.id];
                          const profit = priceData.price - priceData.cost_price;
                          const marginPercent = priceData.price > 0 ? (profit / priceData.price) * 100 : 0;
                          const pointsEarned = Math.max(0, Math.floor(profit * 0.07));
                          const hasVariants = prod.variants && prod.variants.length > 0;

                          // Hitung data pintar untuk baris ini
                          const smartRes = calculateSmartPrice(prod, priceData.cost_price, priceData.price, smartConfig);

                          return (
                            <tr
                              key={prod.id}
                              className={`hover:bg-slate-50/90 transition-colors ${
                                isModified ? 'bg-amber-50/40 border-l-4 border-l-amber-500' : smartRes.isBelowFloor && priceData.cost_price > 0 ? 'bg-rose-50/25' : ''
                              }`}
                            >
                              {/* 1. Thumbnail */}
                              <td className="py-2.5 px-3 text-center">
                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 mx-auto border border-slate-200 shrink-0">
                                  <img
                                    src={prod.image_url || '/logo.webp'}
                                    alt={prod.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </td>

                              {/* 2. Name & Unit & Variant Badge */}
                              <td className="py-2.5 px-3">
                                <p className="font-bold text-slate-800 leading-tight">{prod.name}</p>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                                    /{prod.unit}
                                  </span>
                                  {hasVariants && (
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                      <Scale className="w-3 h-3 text-emerald-600" />
                                      {prod.variants!.length} Varian Timbangan
                                    </span>
                                  )}
                                  <span className="bg-slate-50 text-slate-500 text-[9px] px-1.5 py-0.5 rounded border border-slate-200">
                                    {smartRes.tierLabel}
                                  </span>
                                </div>
                              </td>

                              {/* 3. Cost Price Input (Modal Beli Pasar) */}
                              <td className="py-2.5 px-3 min-w-[170px]">
                                <div className="space-y-1">
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[11px]">Rp</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="500"
                                      value={priceData.cost_price || ''}
                                      onChange={(e) =>
                                        handlePriceFieldChange(prod.id, 'cost_price', Number(e.target.value))
                                      }
                                      className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-xl font-bold text-slate-800 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      title="Modal Pembelian di Pasar Induk / Petani"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-0.5">
                                    <span className="text-amber-800 font-bold">{formatRupiah(priceData.cost_price || 0)}</span>
                                    {priceData.cost_price > 0 && (
                                      <span className="text-slate-500" title={`Modal riil setelah buffer susut ${smartRes.shrinkageRate * 100}% + kemas Rp ${smartRes.packagingCost}`}>
                                        Efektif: {formatRupiah(smartRes.effectiveCost)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* 4. Selling Price Input (Harga Jual PO) */}
                              <td className="py-2.5 px-3 min-w-[170px]">
                                <div className="space-y-1.5">
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-[11px]">Rp</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="500"
                                      value={priceData.price || ''}
                                      onChange={(e) =>
                                        handlePriceFieldChange(prod.id, 'price', Number(e.target.value))
                                      }
                                      className={`w-full pl-8 pr-2 py-1.5 border rounded-xl font-black text-xs outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                        smartRes.isBelowFloor && priceData.cost_price > 0
                                          ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20'
                                          : 'border-emerald-300 text-emerald-900 bg-emerald-50/30 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20'
                                      }`}
                                      title="Harga Jual ke Pelanggan"
                                    />
                                  </div>

                                  <div className="flex items-center justify-between px-1">
                                    <span className="text-[11px] text-emerald-800 font-extrabold tracking-tight">
                                      {formatRupiah(priceData.price || 0)}
                                    </span>

                                    {smartRes.isBelowFloor && priceData.cost_price > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handleApplySingleSmartMarkup(prod)}
                                        className="text-[9px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer animate-pulse"
                                        title={`Klik untuk menerapkan saran harga pintar: ${formatRupiah(smartRes.suggestedPrice)} (Laba aman: ${formatRupiah(smartRes.suggestedProfit)})`}
                                      >
                                        <Sparkles className="w-2.5 h-2.5" />
                                        <span>Saran: {formatRupiah(smartRes.suggestedPrice)}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* 5. Live Profit & Margin Indicator */}
                              <td className="py-2.5 px-3 text-center">
                                {priceData.cost_price <= 0 ? (
                                  <span className="text-[10px] text-slate-400 italic">Belum ada modal</span>
                                ) : smartRes.isBelowFloor ? (
                                  <div className="space-y-0.5">
                                    <span className="font-black text-rose-600 text-xs block">
                                      +{formatRupiah(profit)}
                                    </span>
                                    <span
                                      className="text-[10px] font-black text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 animate-pulse"
                                      title="Laba kiloan di bawah ambang batas minimal Rp 500/kg"
                                    >
                                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                                      Laba &lt; Rp 500/kg
                                    </span>
                                  </div>
                                ) : isKgUnit(prod.unit) ? (
                                  <div className="space-y-0.5">
                                    <span className="font-black text-emerald-700 text-xs block">
                                      +{formatRupiah(profit)}
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full inline-block">
                                      ✓ Untung {formatRupiah(profit)}/kg
                                    </span>
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    <span className="font-black text-slate-800 text-xs block">
                                      +{formatRupiah(profit)}
                                    </span>
                                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full inline-block">
                                      /{prod.unit} ({marginPercent.toFixed(1)}%)
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* 6. Customer Points (1% of Profit) */}
                              <td className="py-2.5 px-3 text-center">
                                <div className="space-y-0.5">
                                  <span className="bg-amber-100 text-amber-900 font-black text-xs px-2.5 py-1 rounded-xl inline-flex items-center gap-1 shadow-2xs">
                                    <Coins className="w-3.5 h-3.5 fill-amber-400 text-amber-600" />
                                    +{pointsEarned} Poin
                                  </span>
                                  <span className="text-[9px] text-slate-400 block">
                                    1% dari untung {formatRupiah(Math.max(0, profit))}
                                  </span>
                                </div>
                              </td>

                              {/* 7. Stock */}
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    value={priceData.stock}
                                    onChange={(e) =>
                                      handlePriceFieldChange(prod.id, 'stock', Number(e.target.value))
                                    }
                                    className="w-14 text-center py-1 border border-slate-200 rounded-lg font-bold text-xs bg-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handlePriceFieldChange(prod.id, 'stock', priceData.stock + 10)
                                    }
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-1.5 py-1 rounded-lg"
                                    title="Tambah +10 stok"
                                  >
                                    +10
                                  </button>
                                </div>
                              </td>

                              {/* 8. Manage Variants & Auto-Recalculate */}
                              <td className="py-2.5 px-3 text-center">
                                <div className="space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenVariantManager(prod)}
                                    className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border flex items-center justify-center gap-1.5 mx-auto transition-all ${
                                      hasVariants
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    <Scale className="w-3.5 h-3.5 text-emerald-600" />
                                    {hasVariants ? `${prod.variants!.length} Varian Berat` : '+ Atur Varian'}
                                  </button>

                                  {isModified && hasVariants && (
                                    <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 block animate-pulse">
                                      ⚡ Varian auto-update
                                    </span>
                                  )}

                                  {isKgUnit(prod.unit) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCalculatorTargetProduct(prod);
                                        setIsKgOnsModalOpen(true);
                                      }}
                                      className="text-[10px] font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-lg flex items-center justify-center gap-1 mx-auto transition-colors shadow-2xs cursor-pointer"
                                      title={`Hitung untung eceran 1 Ons ke 1 Kg untuk ${prod.name}`}
                                    >
                                      <Calculator className="w-3 h-3 text-emerald-600" />
                                      <span>Hitung Ons/Kg</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleQuickAutoRecalculateVariants(prod, 'bumbu')}
                                    className="text-[10px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center justify-center gap-1 mx-auto transition-colors shadow-2xs"
                                    title="Hitung otomatis harga 1 Ons s/d 1 Kg (Eceran sedikit markup, kiloan grosir murah)"
                                  >
                                    <Zap className="w-3 h-3 text-amber-600" />
                                    Auto-Kalkulasi
                                  </button>
                                </div>
                              </td>

                              {/* 9. Actions */}
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {smartRes.isBelowFloor && priceData.cost_price > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleApplySingleSmartMarkup(prod)}
                                      className="p-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                                      title={`Otomatis sesuaikan harga produk ini ke ${formatRupiah(smartRes.suggestedPrice)}`}
                                    >
                                      <Wand2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {isModified && (
                                    <button
                                      type="button"
                                      onClick={() => handleSaveSinglePrice(prod)}
                                      className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                                      title="Simpan perubahan produk ini"
                                    >
                                      <Save className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditProduct(prod)}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs transition-colors"
                                    title="Edit detail lengkap / upload foto R2"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProductClick(prod)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs transition-colors border border-rose-200"
                                    title="Hapus produk permanen"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* MODE 2: CARDS GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {(products || [])
                .filter((p) => {
                  const matchCat = catalogCategory === 'all' || p.category_id === catalogCategory;
                  const matchQ =
                    !catalogSearch ||
                    p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                    p.origin?.toLowerCase().includes(catalogSearch.toLowerCase());
                  return matchCat && matchQ;
                })
                .map((prod) => {
                  const priceData = getProductPriceData(prod);
                  const profit = priceData.price - priceData.cost_price;
                  const points = Math.max(0, Math.floor(profit * 0.07));
                  const hasVariants = prod.variants && prod.variants.length > 0;

                  return (
                    <div
                      key={prod.id}
                      className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                          <img
                            src={prod.image_url || '/logo.webp'}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                          />
                          {prod.image_url && (prod.image_url.includes('r2.dev') || prod.image_url.includes('/api/images') || prod.image_url.includes('jogopawon/')) && (
                            <span className="absolute bottom-0 right-0 bg-sky-600/90 text-[8px] font-black text-white px-1 py-0.2 rounded-tl">
                              R2
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 text-sm truncate">{prod.name}</h4>
                          <span className="text-[10px] text-slate-400 block">{prod.origin}</span>

                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-emerald-700 font-black text-sm">
                              {formatRupiah(prod.price)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Modal: {formatRupiah(prod.cost_price || prod.price * 0.7)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Profit & 1% Points preview badge */}
                      <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Laba Toko:</span>
                          <span className="font-black text-emerald-700">+{formatRupiah(profit)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">1% Poin Pelanggan:</span>
                          <span className="font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg inline-flex items-center gap-0.5 text-[11px]">
                            <Coins className="w-3 h-3 fill-amber-400 text-amber-600" />
                            +{points} Poin
                          </span>
                        </div>
                      </div>

                      {/* Variants & Actions */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                        <button
                          type="button"
                          onClick={() => handleOpenVariantManager(prod)}
                          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border transition-all ${
                            hasVariants
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Scale className="w-3.5 h-3.5 text-emerald-600" />
                          {hasVariants ? `${prod.variants!.length} Varian Berat` : '+ Atur Varian'}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEditProduct(prod)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit Detail
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProductClick(prod)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 rounded-xl flex items-center justify-center transition-colors border border-rose-200"
                            title="Hapus Produk Permanen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* TAB: RADAR HARGA & SCRAPER (PETANI & MEDSOS) */}
      {activeTab === 'scraper' && (
        <PriceRadarScraper
          products={products}
          onRefreshProducts={onRefreshData}
        />
      )}

      {/* TAB: DATA PELANGGAN & KOIN PAWON (REFERRAL) */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>Daftar Akun Pelanggan & Koin Pawon</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pantau saldo koin, kode referral unik, pengundang, dan total belanja setiap akun ibu-ibu / pelanggan.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPushModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>📢 Broadcast Notifikasi HP</span>
              </button>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama / nomor WA / kode..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:border-emerald-600 outline-none w-48 sm:w-64 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={loadCustomerAccountsOnly}
                disabled={loadingCustomerAccounts}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-3.5 py-2 rounded-xl border border-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingCustomerAccounts ? 'animate-spin' : ''}`} />
                <span>Segarkan</span>
              </button>
            </div>
          </div>

          {/* Ringkasan Akun Pelanggan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4">
              <span className="text-[11px] font-bold text-emerald-800 uppercase block">Total Akun Terdaftar</span>
              <span className="text-2xl font-black text-emerald-950 mt-1 block">{customerAccounts.length} Akun</span>
            </div>
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4">
              <span className="text-[11px] font-bold text-amber-800 uppercase block">Total Saldo Koin Pelanggan</span>
              <span className="text-2xl font-black text-amber-950 mt-1 block">
                {customerAccounts.reduce((acc, u) => acc + (u.points || 0), 0).toLocaleString('id-ID')} Koin
              </span>
            </div>
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4">
              <span className="text-[11px] font-bold text-blue-800 uppercase block">Total Bonus Referral Diberikan</span>
              <span className="text-2xl font-black text-blue-950 mt-1 block">
                +{customerAccounts.reduce((acc, u) => acc + (u.referral_earnings || 0), 0).toLocaleString('id-ID')} Koin
              </span>
            </div>
          </div>

          {/* Tabel Pelanggan */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Nama Pelanggan</th>
                  <th className="py-3 px-4">WhatsApp</th>
                  <th className="py-3 px-4">Saldo Koin</th>
                  <th className="py-3 px-4">Kode Referral</th>
                  <th className="py-3 px-4">Pengundang</th>
                  <th className="py-3 px-4">Teman Diajak</th>
                  <th className="py-3 px-4">Total Belanja</th>
                  <th className="py-3 px-4 text-center">Aksi WA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {customerAccounts
                  .filter((u) => {
                    const q = customerSearch.toLowerCase();
                    return (
                      !q ||
                      (u.name && u.name.toLowerCase().includes(q)) ||
                      (u.phone && u.phone.includes(q)) ||
                      (u.referral_code && u.referral_code.toLowerCase().includes(q)) ||
                      (u.referred_by && u.referred_by.toLowerCase().includes(q))
                    );
                  })
                  .map((cust) => (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{cust.name}</span>
                        <span className="text-[10px] text-slate-400">ID: {cust.id.slice(0, 10)}...</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">{cust.phone}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200/80">
                          <Coins className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>{(cust.points || 0).toLocaleString('id-ID')}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          {cust.referral_code}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {cust.referred_by ? (
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                            {cust.referred_by}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">Organik (Langsung)</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900">{cust.referral_count || 0} teman</span>
                        <span className="text-[10px] text-emerald-600 block">+{cust.referral_earnings || 0} koin</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900">Rp {Math.round(cust.total_spent || 0).toLocaleString('id-ID')}</span>
                        <span className="text-[10px] text-slate-400 block">{cust.orders_count || 0} pesanan</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <a
                          href={`https://wa.me/${cust.phone.replace(/^0/, '62').replace(/\D/g, '')}?text=${encodeURIComponent(`Halo Bu ${cust.name}, kami dari Admin JogoPawon Mart. Saldo Koin Pawon Anda saat ini ada ${cust.points || 0} Koin yang bisa ditukarkan dengan sembako gratis!`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-xl shadow-xs transition-all"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Chat</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                {customerAccounts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      {loadingCustomerAccounts ? 'Memuat data pelanggan...' : 'Belum ada akun pelanggan yang terdaftar.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {/* TAB 8: REWARDS MANAGEMENT (Pojok Koin Pawon & Klaim Hadiah) */}
      {activeTab === 'rewards' && (
        <div className="space-y-5">
          {/* Sub-tab Navigation: Klaim Hadiah vs Katalog Hadiah */}
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRewardSubTab('claims')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                  rewardSubTab === 'claims'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>📋 Klaim Penukaran Hadiah</span>
                {pendingClaimsCount > 0 ? (
                  <span className="px-2 py-0.5 text-[10px] bg-amber-500 text-white rounded-full font-black animate-pulse">
                    {pendingClaimsCount} Menunggu ACC
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] bg-slate-200 text-slate-700 rounded-full font-black">
                    {redemptions.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setRewardSubTab('catalog')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                  rewardSubTab === 'catalog'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <Gift className="w-4 h-4 text-emerald-400" />
                <span>🎁 Kelola Katalog Hadiah ({rewards.length})</span>
              </button>
            </div>

            {rewardSubTab === 'catalog' && (
              <button
                type="button"
                onClick={handleOpenAddReward}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Hadiah Baru</span>
              </button>
            )}

            {rewardSubTab === 'claims' && (
              <button
                type="button"
                onClick={loadExtraData}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Segarkan Data Klaim</span>
              </button>
            )}
          </div>

          {/* SUBTAB 1: KLAIM PENUKARAN HADIAH PELANGGAN */}
          {rewardSubTab === 'claims' && (
            <div className="space-y-4">
              {/* Claims Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-400 block">Total Semua Klaim</span>
                  <span className="text-xl font-black text-slate-900 mt-0.5 block">{redemptions.length}</span>
                  <span className="text-[10px] text-slate-400">Sepanjang waktu</span>
                </div>

                <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80 shadow-2xs">
                  <span className="text-[11px] font-bold text-amber-800 block flex items-center gap-1">
                    <Clock className="w-3 h-3 animate-spin text-amber-600" /> Menunggu ACC
                  </span>
                  <span className="text-xl font-black text-amber-900 mt-0.5 block">{pendingClaimsCount}</span>
                  <span className="text-[10px] text-amber-700">Perlu tindakan</span>
                </div>

                <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200/80 shadow-2xs">
                  <span className="text-[11px] font-bold text-blue-800 block">Disetujui / Disiapkan</span>
                  <span className="text-xl font-black text-blue-900 mt-0.5 block">
                    {redemptions.filter((c) => c.status === 'approved').length}
                  </span>
                  <span className="text-[10px] text-blue-700">Siap diantar kurir</span>
                </div>

                <div className="bg-purple-50/70 p-3.5 rounded-2xl border border-purple-200/80 shadow-2xs">
                  <span className="text-[11px] font-bold text-purple-800 block">Sedang Diantar</span>
                  <span className="text-xl font-black text-purple-900 mt-0.5 block">
                    {redemptions.filter((c) => c.status === 'shipping').length}
                  </span>
                  <span className="text-[10px] text-purple-700">Kurir di jalan</span>
                </div>

                <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-emerald-800 block">Selesai & Diterima</span>
                  <span className="text-xl font-black text-emerald-900 mt-0.5 block">
                    {redemptions.filter((c) => c.status === 'completed').length}
                  </span>
                  <span className="text-[10px] text-emerald-700">Pelanggan puas</span>
                </div>
              </div>

              {/* Filters & Search Bar */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {[
                    { id: 'all', label: `Semua (${redemptions.length})` },
                    { id: 'pending', label: `⏳ Menunggu ACC (${pendingClaimsCount})` },
                    { id: 'approved', label: `✅ Disetujui (${redemptions.filter((c) => c.status === 'approved').length})` },
                    { id: 'shipping', label: `🛵 Sedang Diantar (${redemptions.filter((c) => c.status === 'shipping').length})` },
                    { id: 'completed', label: `🎉 Selesai (${redemptions.filter((c) => c.status === 'completed').length})` },
                    { id: 'rejected', label: `❌ Ditolak (${redemptions.filter((c) => c.status === 'rejected').length})` },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setClaimFilter(filter.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                        claimFilter === filter.id
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari klaim, nama, WA..."
                    value={claimSearch}
                    onChange={(e) => setClaimSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Claims List */}
              {filteredRedemptions.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200 space-y-3">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                  <div>
                    <h4 className="font-bold text-slate-700 text-sm">Tidak ada klaim hadiah yang cocok</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Belum ada permintaan penukaran poin hadiah dengan filter ini.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredRedemptions.map((claim) => (
                    <div
                      key={claim.id}
                      className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden p-4 sm:p-5 space-y-3.5 hover:border-slate-300 transition-colors"
                    >
                      {/* Header bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-black text-xs sm:text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                            {claim.claim_number}
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(claim.created_at).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>

                        <div>
                          {claim.status === 'pending' && (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs px-3 py-1 rounded-full font-black flex items-center gap-1 animate-pulse">
                              <Clock className="w-3.5 h-3.5" /> Menunggu Konfirmasi Admin
                            </span>
                          )}
                          {claim.status === 'approved' && (
                            <span className="bg-blue-100 text-blue-900 border border-blue-300 text-xs px-3 py-1 rounded-full font-black flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Disetujui & Siapkan Hadiah
                            </span>
                          )}
                          {claim.status === 'shipping' && (
                            <span className="bg-purple-100 text-purple-900 border border-purple-300 text-xs px-3 py-1 rounded-full font-black flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5" /> Sedang Diantar ({claim.courier_name || 'Kurir Subuh'})
                            </span>
                          )}
                          {claim.status === 'completed' && (
                            <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs px-3 py-1 rounded-full font-black flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Selesai & Diterima Pelanggan
                            </span>
                          )}
                          {claim.status === 'rejected' && (
                            <span className="bg-rose-100 text-rose-900 border border-rose-300 text-xs px-3 py-1 rounded-full font-black flex items-center gap-1">
                              <X className="w-3.5 h-3.5" /> Ditolak (Poin Dikembalikan)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content Columns */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Col 1: Reward Info */}
                        <div className="bg-gradient-to-r from-amber-50/70 to-orange-50/50 p-3.5 rounded-2xl border border-amber-200/80 flex items-center gap-3.5">
                          <img
                            src={claim.reward_image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200'}
                            alt={claim.reward_name}
                            className="w-16 h-16 rounded-xl object-cover bg-white border border-amber-200 shrink-0"
                          />
                          <div>
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-md">
                              {claim.reward_category || 'Sembako'}
                            </span>
                            <h4 className="font-black text-slate-900 text-sm mt-0.5">{claim.reward_name}</h4>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Coins className="w-3.5 h-3.5 text-amber-600 fill-amber-400" />
                              <span className="font-black text-amber-900 text-xs">{claim.points_spent} Poin</span>
                              {claim.reward_unit && <span className="text-[11px] text-slate-500">({claim.reward_unit})</span>}
                            </div>
                          </div>
                        </div>

                        {/* Col 2: Customer & Delivery Info */}
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-[11px]">Pelanggan:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{claim.customer_name}</span>
                              <a
                                href={getClaimWhatsAppChatUrl(claim)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md font-bold text-[10px] transition-colors"
                                title="Chat WhatsApp Pelanggan"
                              >
                                <MessageCircle className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                                <span>{claim.customer_phone}</span>
                              </a>
                            </div>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-[11px]">Metode:</span>
                            <span className="font-semibold text-slate-800">
                              {claim.delivery_option === 'antar_subuh' ? '🚚 Diantar Kurir Subuh' : '🏪 Ambil di Toko JogoPawon'}
                            </span>
                          </div>

                          {claim.delivery_address && (
                            <div className="text-[11px]">
                              <span className="text-slate-400 block">Alamat Pengantaran:</span>
                              <span className="text-slate-700 font-medium">{claim.delivery_address}</span>
                            </div>
                          )}

                          {claim.notes && (
                            <div className="text-[11px] bg-white p-2 rounded-xl border border-slate-200">
                              <span className="text-amber-800 font-bold block">Catatan Pelanggan:</span>
                              <span className="text-slate-600 italic">"{claim.notes}"</span>
                            </div>
                          )}

                          {claim.admin_notes && (
                            <div className="text-[11px] bg-slate-100 p-2 rounded-xl border border-slate-200">
                              <span className="text-slate-500 font-bold block">Catatan Admin:</span>
                              <span className="text-slate-700">{claim.admin_notes}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Next Actions Bar */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs font-bold text-slate-500">
                          Tindakan Selanjutnya:
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Chat WhatsApp Button */}
                          <a
                            href={getClaimWhatsAppChatUrl(claim)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                            <span>Chat WA</span>
                          </a>

                          {/* PENDING ACTIONS */}
                          {claim.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                disabled={processingClaimId === claim.id}
                                onClick={() => handleApproveClaim(claim)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Setujui & Siapkan</span>
                              </button>

                              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                                <select
                                  value={selectedCourierForClaim[claim.id] || (couriers[0]?.name || 'Kurir Subuh 1')}
                                  onChange={(e) =>
                                    setSelectedCourierForClaim((prev) => ({ ...prev, [claim.id]: e.target.value }))
                                  }
                                  className="text-xs bg-transparent border-none outline-none font-medium text-slate-700 py-0.5 px-1"
                                >
                                  {(couriers.length > 0 ? couriers : [{ id: 'c1', name: 'Kurir Subuh 1' }, { id: 'c2', name: 'Kurir Subuh 2' }]).map((c) => (
                                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  disabled={processingClaimId === claim.id}
                                  onClick={() => handleShipClaim(claim)}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                >
                                  <Truck className="w-3 h-3" />
                                  <span>Kirim</span>
                                </button>
                              </div>

                              <button
                                type="button"
                                disabled={processingClaimId === claim.id}
                                onClick={() => handleRejectClaim(claim)}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                                title="Tolak dan kembalikan poin secara otomatis"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Tolak & Refund</span>
                              </button>
                            </>
                          )}

                          {/* APPROVED ACTIONS */}
                          {claim.status === 'approved' && (
                            <>
                              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                                <select
                                  value={selectedCourierForClaim[claim.id] || (couriers[0]?.name || 'Kurir Subuh 1')}
                                  onChange={(e) =>
                                    setSelectedCourierForClaim((prev) => ({ ...prev, [claim.id]: e.target.value }))
                                  }
                                  className="text-xs bg-transparent border-none outline-none font-medium text-slate-700 py-0.5 px-1"
                                >
                                  {(couriers.length > 0 ? couriers : [{ id: 'c1', name: 'Kurir Subuh 1' }, { id: 'c2', name: 'Kurir Subuh 2' }]).map((c) => (
                                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  disabled={processingClaimId === claim.id}
                                  onClick={() => handleShipClaim(claim)}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  <span>Kirim via Kurir</span>
                                </button>
                              </div>

                              <button
                                type="button"
                                disabled={processingClaimId === claim.id}
                                onClick={() => handleCompleteClaim(claim)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Tandai Diterima</span>
                              </button>

                              <button
                                type="button"
                                disabled={processingClaimId === claim.id}
                                onClick={() => handleRejectClaim(claim)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition-colors"
                              >
                                Batal / Refund
                              </button>
                            </>
                          )}

                          {/* SHIPPING ACTIONS */}
                          {claim.status === 'shipping' && (
                            <button
                              type="button"
                              disabled={processingClaimId === claim.id}
                              onClick={() => handleCompleteClaim(claim)}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Tandai Selesai & Diterima Pelanggan</span>
                            </button>
                          )}

                          {/* COMPLETED ACTIONS */}
                          {claim.status === 'completed' && (
                            <span className="text-xs text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                              <Check className="w-3.5 h-3.5" />
                              Hadiah telah berhasil diterima oleh pelanggan
                            </span>
                          )}

                          {/* REJECTED ACTIONS */}
                          {claim.status === 'rejected' && (
                            <span className="text-xs text-rose-700 font-bold flex items-center gap-1 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                              <X className="w-3.5 h-3.5" />
                              Klaim ditolak ({claim.points_spent} poin otomatis dikembalikan)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUBTAB 2: KELOLA KATALOG HADIAH */}
          {rewardSubTab === 'catalog' && (
            <div className="space-y-5">
              {/* Top Banner & Header */}
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-700 rounded-3xl p-6 text-white shadow-lg flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-amber-100 text-xs font-black uppercase tracking-wider">
                <Gift className="w-3.5 h-3.5" />
                Loyalty & Hadiah Koin Pawon
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Katalog Penukaran Hadiah Pelanggan
              </h2>
              <p className="text-xs text-amber-100/90 leading-relaxed">
                Pelanggan menukarkan koin belanja mereka dengan aneka sembako, alat rumah tangga praktis, elektronik dapur, atau voucher belanja. Anda dapat menambah, mengubah jumlah koin, dan memantau ketersediaan stok fisik di sini.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddReward}
              className="bg-white text-amber-900 hover:bg-amber-50 font-black text-xs px-5 py-3 rounded-2xl shadow-md flex items-center gap-2 transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              + Tambah Hadiah Baru
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span>Total Item Hadiah</span>
                <Gift className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">{rewards.length}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Tersedia di aplikasi</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span>🌾 Sembako & Dapur</span>
                <Package className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-black text-amber-800">
                {rewards.filter((r) => r.category === 'Sembako').length}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Beras, minyak, gula, bumbu</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span>🍳 Alat & Elektronik</span>
                <Zap className="w-4 h-4 text-sky-600" />
              </div>
              <p className="text-2xl font-black text-sky-800">
                {rewards.filter((r) => r.category === 'Alat Rumah Tangga' || r.category === 'Elektronik').length}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Perabot teflon & elektronik</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span>Total Stok Fisik</span>
                <Coins className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-black text-purple-800">
                {rewards.reduce((sum, r) => sum + (r.stock || 0), 0)} unit
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Siap diklaim pelanggan</p>
            </div>
          </div>

          {/* Category Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setRewardCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                    rewardCategoryFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua ({rewards.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRewardCategoryFilter('Sembako')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                    rewardCategoryFilter === 'Sembako'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  🌾 Sembako & Dapur ({rewards.filter((r) => r.category === 'Sembako').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRewardCategoryFilter('Alat Rumah Tangga')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                    rewardCategoryFilter === 'Alat Rumah Tangga'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
                  }`}
                >
                  🍳 Alat Rumah Tangga ({rewards.filter((r) => r.category === 'Alat Rumah Tangga').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRewardCategoryFilter('Elektronik')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                    rewardCategoryFilter === 'Elektronik'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
                  }`}
                >
                  ⚡ Elektronik Dapur ({rewards.filter((r) => r.category === 'Elektronik').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRewardCategoryFilter('Voucher')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                    rewardCategoryFilter === 'Voucher'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                  }`}
                >
                  🎟️ Voucher Diskon ({rewards.filter((r) => r.category === 'Voucher').length})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama hadiah..."
                  value={rewardSearch}
                  onChange={(e) => setRewardSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Reward Items Grid */}
          {filteredRewards.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200 space-y-3">
              <Gift className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <h4 className="font-bold text-slate-700 text-sm">Tidak ada item hadiah yang sesuai</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Coba ubah filter kategori atau tambahkan item hadiah baru dengan tombol di atas.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddReward}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Tambah Hadiah Baru
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredRewards.map((reward) => {
                const getCategoryBadge = (cat: string) => {
                  switch (cat) {
                    case 'Sembako':
                      return (
                        <span className="bg-amber-100 text-amber-900 font-black text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-200">
                          🌾 Sembako & Dapur
                        </span>
                      );
                    case 'Alat Rumah Tangga':
                      return (
                        <span className="bg-orange-100 text-orange-900 font-black text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 border border-orange-200">
                          🍳 Alat Rumah Tangga
                        </span>
                      );
                    case 'Elektronik':
                      return (
                        <span className="bg-sky-100 text-sky-900 font-black text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 border border-sky-200">
                          ⚡ Elektronik Dapur
                        </span>
                      );
                    case 'Voucher':
                      return (
                        <span className="bg-purple-100 text-purple-900 font-black text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 border border-purple-200">
                          🎟️ Voucher Belanja
                        </span>
                      );
                    default:
                      return (
                        <span className="bg-slate-100 text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded-md">
                          {cat}
                        </span>
                      );
                  }
                };

                return (
                  <div
                    key={reward.id}
                    className="bg-white rounded-3xl p-4 border border-slate-100 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      {/* Image Preview & Badges */}
                      <div className="relative w-full h-40 rounded-2xl bg-slate-50 overflow-hidden border border-slate-100 flex items-center justify-center">
                        {(reward.image_url || reward.imageUrl) ? (
                          <img
                            src={reward.image_url || reward.imageUrl}
                            alt={reward.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Gift className="w-12 h-12 text-slate-300" />
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-2 left-2">
                          {getCategoryBadge(reward.category)}
                        </div>

                        {/* Stock Badge */}
                        <div className="absolute bottom-2 right-2">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs ${
                              reward.stock > 5
                                ? 'bg-emerald-500 text-white'
                                : reward.stock > 0
                                ? 'bg-amber-500 text-white'
                                : 'bg-rose-500 text-white'
                            }`}
                          >
                            Stok: {reward.stock} {reward.unit || 'item'}
                          </span>
                        </div>
                      </div>

                      {/* Title & Unit */}
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-black text-slate-900 text-sm line-clamp-1 group-hover:text-emerald-700 transition-colors">
                            {reward.name}
                          </h4>
                        </div>
                        {reward.unit && (
                          <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                            Kemasan: {reward.unit}
                          </p>
                        )}
                        {reward.description && (
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {reward.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Points & Admin Action Buttons */}
                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
                        <Coins className="w-3.5 h-3.5 fill-amber-400 text-amber-600" />
                        <span className="font-black text-amber-900 text-xs">
                          {reward.points_required ?? reward.pointsCost} Koin
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditReward(reward)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors border border-slate-200 hover:border-emerald-300"
                          title="Edit Hadiah"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteReward(reward.id, reward.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200 hover:border-rose-300"
                          title="Hapus Hadiah"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        )}
        </div>
      )}

      {/* Invoice / Struk Thermal Modal */}
      {selectedOrderForInvoice && (
        <ThermalReceiptModal
          order={selectedOrderForInvoice}
          onClose={() => setSelectedOrderForInvoice(null)}
        />
      )}

      {/* Add Product Modal */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Tambah Produk / Barang Baru</h3>
              <button
                type="button"
                onClick={() => setIsAddProductOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddProductSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Nama Produk / Barang</label>
                <input
                  type="text"
                  required
                  placeholder="Cth: Selada Keriting, Telur Ayam, Beras, dll"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full p-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Kategori Produk</label>
                {categories.length > 0 ? (
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full p-2 border rounded-xl bg-white"
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Kategori (cth: Sayuran, Minuman, Sembako)"
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full p-2 border rounded-xl"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={newProdPrice || ''}
                    onChange={(e) => setNewProdPrice(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                  />
                  <span className="text-xs text-emerald-700 font-extrabold block mt-1">
                    {formatRupiah(newProdPrice || 0)}
                  </span>
                </div>
                <div>
                  <label className="font-bold block mb-1">Harga Modal / HPP (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={newProdCost || ''}
                    onChange={(e) => setNewProdCost(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                  />
                  <span className="text-xs text-amber-700 font-extrabold block mt-1">
                    {formatRupiah(newProdCost || 0)}
                  </span>
                </div>
              </div>

              {/* Live Profit & 7% Customer Points Calculator */}
              {(() => {
                const addProfit = newProdPrice - newProdCost;
                const addPoints = Math.max(0, Math.floor(addProfit * 0.07));
                const addMargin = newProdPrice > 0 ? (addProfit / newProdPrice) * 100 : 0;
                return (
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Estimasi Laba:</span>
                      <span className={`font-black ${addProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {addProfit >= 0 ? `+${formatRupiah(addProfit)}` : formatRupiah(addProfit)} ({addMargin.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-emerald-200/60 pt-1">
                      <span className="text-slate-500 font-semibold flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-amber-600" /> 1% Poin Pelanggan:
                      </span>
                      <span className="font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg text-[11px]">
                        +{addPoints} Poin
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Satuan Produk</label>
                  <input
                    type="text"
                    required
                    placeholder="Cth: kg, ikat, biji, pack"
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold"
                  />
                  {/* Quick Unit Pills */}
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {['kg', 'ikat', 'biji', 'buah', 'pack', 'butir', 'gram', 'kotak', 'bungkus'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setNewProdUnit(u)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                          newProdUnit.toLowerCase() === u
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Pilih <strong>kg</strong> jika sayur/buah ditimbang (varian 100g, 250g, 500g). Pilih <strong>ikat</strong> atau <strong>biji</strong> jika dijual per biji/ikat utuh.
                  </p>
                </div>
                <div>
                  <label className="font-bold block mb-1">Stok Awal</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-slate-600 font-bold block mt-1">
                    {newProdStock} {newProdUnit || 'unit'}
                  </span>
                </div>
              </div>

              {/* Toggle Pembelian Nominal Bebas (Custom Budget) */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-xs text-amber-950 flex items-center gap-1.5 cursor-pointer">
                      <span>🥗 Izinkan Pembelian Custom Budget (Nominal Bebas)</span>
                    </label>
                    <p className="text-[10px] text-amber-800/80">
                      Pelanggan bisa beli ecer nominal sendiri (misal: Sawi Rp 2.000 walau 1 ikat Rp 5.000)
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={newProdAllowCustomBudget}
                    onChange={(e) => setNewProdAllowCustomBudget(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>

                {newProdAllowCustomBudget && (
                  <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold text-amber-900">
                      Minimal Pembelian Bebas (Rp):
                    </span>
                    <div className="w-32">
                      <input
                        type="number"
                        min="500"
                        step="500"
                        value={newProdMinCustomBudget}
                        onChange={(e) => setNewProdMinCustomBudget(Number(e.target.value))}
                        className="w-full p-1.5 text-xs border border-amber-300 rounded-lg bg-white font-bold text-right"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold block text-xs text-slate-800">Foto & Video Produk (Cloudflare R2)</label>
                  <span className="text-[10px] bg-sky-50 text-sky-600 font-semibold px-2 py-0.5 rounded-full border border-sky-100 flex items-center gap-1">
                    ☁️ Cloudflare R2
                  </span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleMediaUpload(e.target.files, false);
                    }
                    e.target.value = '';
                  }}
                />

                <div className="mb-2">
                  <button
                    type="button"
                    disabled={isUploadingR2}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl flex items-center justify-center gap-2 text-emerald-700 font-bold text-xs transition-all shadow-2xs disabled:opacity-60"
                  >
                    {isUploadingR2 ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>{uploadProgressText || 'Mengunggah ke Cloudflare R2...'}</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4 text-emerald-600" />
                        <span>+ Pilih Foto / Video (Bisa Pilih Banyak Sekaligus)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Thumbnails of Uploaded Images & Videos */}
                {(newProdImages.length > 0 || newProdVideos.length > 0) ? (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-700">
                        Media Terupload ({newProdImages.length} Foto, {newProdVideos.length} Video)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Foto pertama otomatis jadi sampul utama
                      </span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {/* Photo Thumbnails */}
                      {newProdImages.map((imgUrl, idx) => (
                        <div
                          key={`new-img-${idx}`}
                          className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white group shadow-2xs"
                        >
                          <img src={imgUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                          {idx === 0 && (
                            <span className="absolute bottom-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                              Utama
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveNewMedia('image', idx)}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow transition-colors"
                            title="Hapus foto ini"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}

                      {/* Video Thumbnails */}
                      {newProdVideos.map((vidUrl, idx) => (
                        <div
                          key={`new-vid-${idx}`}
                          className="relative aspect-square rounded-xl overflow-hidden border border-purple-300 bg-slate-900 group shadow-2xs flex items-center justify-center"
                        >
                          <video src={vidUrl} className="w-full h-full object-cover opacity-70" preload="metadata" />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Play className="w-5 h-5 text-white drop-shadow fill-white" />
                          </div>
                          <span className="absolute bottom-1 left-1 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                            Video
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveNewMedia('video', idx)}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow transition-colors"
                            title="Hapus video ini"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Belum ada media dipilih. Klik tombol di atas untuk memilih foto atau video produk dari galeri HP / laptop.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploadingR2}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal with R2 Upload */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit className="w-4 h-4 text-emerald-600" /> Edit Produk & Foto R2
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProductSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Nama Produk / Barang</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Kategori Produk</label>
                {categories.length > 0 ? (
                  <select
                    value={editingProduct.category_id}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value })}
                    className="w-full p-2 border rounded-xl bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={editingProduct.category_id}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value })}
                    className="w-full p-2 border rounded-xl"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={editingProduct.price || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-emerald-700 font-extrabold block mt-1">
                    {formatRupiah(editingProduct.price || 0)}
                  </span>
                </div>
                <div>
                  <label className="font-bold block mb-1">Harga Modal / HPP (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={editingProduct.cost_price || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, cost_price: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-amber-700 font-extrabold block mt-1">
                    {formatRupiah(editingProduct.cost_price || 0)}
                  </span>
                </div>
              </div>

              {/* Live Profit & 7% Customer Points Calculator */}
              {(() => {
                const editProfit = (editingProduct.price || 0) - (editingProduct.cost_price || 0);
                const editPoints = Math.max(0, Math.floor(editProfit * 0.07));
                const editMargin = editingProduct.price > 0 ? (editProfit / editingProduct.price) * 100 : 0;
                return (
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Estimasi Keuntungan:</span>
                      <span className={`font-black ${editProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {editProfit >= 0 ? `+${formatRupiah(editProfit)}` : formatRupiah(editProfit)} ({editMargin.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-emerald-200/60 pt-1.5">
                      <span className="text-slate-500 font-semibold flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-amber-600" /> 1% Bonus Poin Pelanggan:
                      </span>
                      <span className="font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg text-[11px]">
                        +{editPoints} Poin
                      </span>
                    </div>
                    <div className="pt-1 flex items-center justify-between border-t border-emerald-200/60">
                      <span className="text-[10px] text-slate-500">
                        {editingProduct.variants && editingProduct.variants.length > 0
                          ? `Ada ${editingProduct.variants.length} varian timbangan`
                          : 'Belum ada varian berat'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const prod = editingProduct;
                          setEditingProduct(null);
                          handleOpenVariantManager(prod);
                        }}
                        className="text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Scale className="w-3 h-3 text-emerald-700" />
                        Kelola Varian Berat (1 Ons, dll)
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Satuan Produk</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.unit}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold"
                  />
                  {/* Quick Unit Pills */}
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {['kg', 'ikat', 'biji', 'buah', 'pack', 'butir', 'gram', 'kotak', 'bungkus'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setEditingProduct({ ...editingProduct, unit: u })}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                          (editingProduct.unit || '').toLowerCase() === u
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="font-bold block mb-1">Stok Tersedia</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-slate-600 font-bold block mt-1">
                    {editingProduct.stock} {editingProduct.unit}
                  </span>
                </div>
              </div>

              {/* Toggle Pembelian Nominal Bebas (Custom Budget) */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-xs text-amber-950 flex items-center gap-1.5 cursor-pointer">
                      <span>🥗 Izinkan Pembelian Custom Budget (Nominal Bebas)</span>
                    </label>
                    <p className="text-[10px] text-amber-800/80">
                      Pelanggan bisa beli ecer nominal sendiri (misal: Sawi Rp 2.000 walau 1 ikat Rp 5.000)
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingProduct.allow_custom_budget || false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, allow_custom_budget: e.target.checked })}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>

                {editingProduct.allow_custom_budget && (
                  <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold text-amber-900">
                      Minimal Pembelian Bebas (Rp):
                    </span>
                    <div className="w-32">
                      <input
                        type="number"
                        min="500"
                        step="500"
                        value={editingProduct.min_custom_budget ?? 1000}
                        onChange={(e) => setEditingProduct({ ...editingProduct, min_custom_budget: Number(e.target.value) })}
                        className="w-full p-1.5 text-xs border border-amber-300 rounded-lg bg-white font-bold text-right"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* R2 Media Section for Edit Product */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold block text-xs text-slate-800">Foto & Video Produk (Cloudflare R2)</label>
                  <span className="text-[10px] bg-sky-50 text-sky-600 font-semibold px-2 py-0.5 rounded-full border border-sky-100 flex items-center gap-1">
                    ☁️ Cloudflare R2
                  </span>
                </div>

                <input
                  type="file"
                  ref={editFileInputRef}
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleMediaUpload(e.target.files, true);
                    }
                    e.target.value = '';
                  }}
                />

                <div className="mb-2">
                  <button
                    type="button"
                    disabled={isUploadingR2}
                    onClick={() => editFileInputRef.current?.click()}
                    className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl flex items-center justify-center gap-2 text-emerald-700 font-bold text-xs transition-all shadow-2xs disabled:opacity-60"
                  >
                    {isUploadingR2 ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>{uploadProgressText || 'Mengunggah ke Cloudflare R2...'}</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4 text-emerald-600" />
                        <span>+ Tambah Foto / Video (Bisa Pilih Banyak Sekaligus)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Thumbnails of Uploaded Images & Videos */}
                {((editingProduct.images && editingProduct.images.length > 0) || editingProduct.image_url || (editingProduct.videos && editingProduct.videos.length > 0) || editingProduct.video_url) ? (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-700">
                        Media Produk
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Foto pertama otomatis jadi sampul utama
                      </span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {/* Photo Thumbnails */}
                      {(editingProduct.images && editingProduct.images.length > 0 ? editingProduct.images : (editingProduct.image_url ? [editingProduct.image_url] : [])).map((imgUrl, idx) => (
                        <div
                          key={`edit-img-${idx}`}
                          className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white group shadow-2xs"
                        >
                          <img src={imgUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                          {idx === 0 && (
                            <span className="absolute bottom-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                              Utama
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveEditMedia('image', idx)}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow transition-colors"
                            title="Hapus foto ini"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}

                      {/* Video Thumbnails */}
                      {(editingProduct.videos && editingProduct.videos.length > 0 ? editingProduct.videos : (editingProduct.video_url ? [editingProduct.video_url] : [])).map((vidUrl, idx) => (
                        <div
                          key={`edit-vid-${idx}`}
                          className="relative aspect-square rounded-xl overflow-hidden border border-purple-300 bg-slate-900 group shadow-2xs flex items-center justify-center"
                        >
                          <video src={vidUrl} className="w-full h-full object-cover opacity-70" preload="metadata" />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Play className="w-5 h-5 text-white drop-shadow fill-white" />
                          </div>
                          <span className="absolute bottom-1 left-1 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                            Video
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveEditMedia('video', idx)}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow transition-colors"
                            title="Hapus video ini"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Belum ada media untuk produk ini. Klik tombol di atas untuk mengunggah foto atau video.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const prodToDelete = editingProduct;
                    setEditingProduct(null);
                    handleDeleteProductClick(prodToDelete);
                  }}
                  className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 font-bold flex items-center gap-1.5 transition-colors text-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus Produk
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-medium text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isUploadingR2}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold transition-colors text-xs"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Waste Modal */}
      {isAddWasteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Catat Sayur Afkir / Rusak</h3>
            <form onSubmit={handleAddWasteSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Pilih Produk</label>
                <select
                  value={wasteProdId}
                  onChange={(e) => setWasteProdId(e.target.value)}
                  className="w-full p-2 border rounded-xl bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1">Jumlah Rusak / Layu</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={wasteQty}
                  onChange={(e) => setWasteQty(Number(e.target.value))}
                  className="w-full p-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Penyebab / Alasan</label>
                <input
                  type="text"
                  required
                  placeholder="Cth: Daun bawah membusuk, patah batang saat pengangkutan"
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value)}
                  className="w-full p-2 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddWasteOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold"
                >
                  Simpan Catatan Afkir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Add Cash Transaction Modal */}
      {isAddTxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">Catat Transaksi Kas Riil</h3>
              </div>
              <button
                onClick={() => setIsAddTxOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCashTxSubmit} className="space-y-3.5 text-xs">
              {/* Type toggle */}
              <div>
                <label className="font-bold block mb-1.5 text-slate-700">Tipe Mutasi Kas</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTxType('expense');
                      setTxCategory('Operasional Toko');
                    }}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                      txType === 'expense'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    Kas Keluar (Beban)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTxType('income');
                      setTxCategory('Penjualan Offline Langsung');
                    }}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                      txType === 'income'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Kas Masuk (Pendapatan)
                  </button>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="font-bold block mb-1 text-slate-700">Kategori Kas</label>
                {txType === 'expense' ? (
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-medium outline-none focus:border-emerald-500"
                  >
                    <option value="Operasional Toko">Operasional Toko</option>
                    <option value="Bensin & Transportasi Kurir">Bensin & Transportasi Kurir</option>
                    <option value="Es Batu & Pendingin Sayur">Es Batu & Pendingin Sayur</option>
                    <option value="Kemasan, Kresek & Wrapping">Kemasan, Kresek & Wrapping</option>
                    <option value="Konsumsi Tim Belanja Subuh">Konsumsi Tim Belanja Subuh</option>
                    <option value="Listrik, Air & Kebersihan">Listrik, Air & Kebersihan</option>
                    <option value="Perlengkapan & Timbangan">Perlengkapan & Timbangan</option>
                    <option value="Biaya Lain-lain">Biaya Lain-lain</option>
                  </select>
                ) : (
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-medium outline-none focus:border-emerald-500"
                  >
                    <option value="Penjualan Offline Langsung">Penjualan Offline Langsung</option>
                    <option value="Modal Tambahan Pemilik">Modal Tambahan Pemilik</option>
                    <option value="Pendapatan Parkir / Titipan">Pendapatan Parkir / Titipan</option>
                    <option value="Pemasukan Lain-lain">Pemasukan Lain-lain</option>
                  </select>
                )}
              </div>

              {/* Nominal */}
              <div>
                <label className="font-bold block mb-1 text-slate-700">Nominal Transaksi (Rp)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Contoh: 25000"
                    value={txAmount || ''}
                    onChange={(e) => setTxAmount(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="font-bold block mb-1 text-slate-700">Keterangan / Uraian</label>
                <input
                  type="text"
                  required
                  placeholder={txType === 'expense' ? 'Cth: Beli 2 karung es batu kristal pendingin sayur' : 'Cth: Penjualan sayur sisa pasar ke warung'}
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-emerald-500"
                />
              </div>

              {/* Date */}
              <div>
                <label className="font-bold block mb-1 text-slate-700">Tanggal Transaksi</label>
                <input
                  type="date"
                  required
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddTxOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTx}
                  className={`px-5 py-2 rounded-xl text-white font-bold transition-all ${
                    txType === 'expense'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  } disabled:opacity-50`}
                >
                  {isSubmittingTx ? 'Menyimpan...' : 'Simpan Transaksi Kas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Variant Manager Modal (1 Ons, 1/4 kg, 1/2 kg, 3/4 kg, 1 kg) */}
      {isVariantModalOpen && variantTargetProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-3xl shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto border border-slate-100">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-xl">
                    <Scale className="w-5 h-5 text-emerald-700" />
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                      Atur Varian Berat Timbangan
                    </h3>
                    <p className="text-xs text-emerald-700 font-bold">
                      Produk: {variantTargetProduct.name} (Satuan Dasar: {variantTargetProduct.unit})
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Atur kelipatan berat (contoh: 1 Ons, 1/4 kg, 1/2 kg, 3/4 kg, 1 kg). Masukkan modal kulakan dan harga jual, sistem otomatis menghitung laba dan mengalokasikan 1% keuntungan ke poin pelanggan.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsVariantModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Smart Pricing Logic Guide Box */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-3.5 rounded-2xl border border-emerald-200/90 space-y-2 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-black text-emerald-900 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  Rumus Cerdas: Beli Kiloan Murah (Grosir), Beli Eceran Sedikit Markup
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCalculatorTargetProduct(variantTargetProduct);
                      setIsKgOnsModalOpen(true);
                    }}
                    className="text-[10px] font-black bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                    title="Buka kalkulator simulasi keuntungan 1 ons ke 1 kg"
                  >
                    <Calculator className="w-3 h-3" />
                    <span>🧮 Kalkulator Laba Ons ➔ Kg</span>
                  </button>
                  <span className="text-[10px] font-bold bg-white text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                    Standar Pedagang Pasar Modern
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Pembelian <strong>1 kg</strong> adalah harga dasar termurah per gram. Pembelian eceran diberi sedikit markup wajar untuk menutup biaya kantong plastik, tenaga menimbang, dan susut timbangan:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center font-bold text-[11px]">
                <div className="bg-white p-2 rounded-xl border border-emerald-100 shadow-2xs">
                  <span className="text-slate-500 block text-[10px]">1 Ons (100g)</span>
                  <span className="text-emerald-700 font-black">+20% Markup</span>
                  <span className="text-[9px] text-slate-400 block font-normal">Ketengan praktis</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-emerald-100 shadow-2xs">
                  <span className="text-slate-500 block text-[10px]">1/4 kg (250g)</span>
                  <span className="text-emerald-700 font-black">+12% Markup</span>
                  <span className="text-[9px] text-slate-400 block font-normal">Ukuran masak 2 hari</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-emerald-100 shadow-2xs">
                  <span className="text-slate-500 block text-[10px]">1/2 kg (500g)</span>
                  <span className="text-emerald-700 font-black">+6% Markup</span>
                  <span className="text-[9px] text-slate-400 block font-normal">Porsi mingguan</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-emerald-100 shadow-2xs">
                  <span className="text-slate-500 block text-[10px]">1 kg (1000g)</span>
                  <span className="text-emerald-900 font-black">Termurah (0%)</span>
                  <span className="text-[9px] text-emerald-600 block font-normal">Harga grosir hemat</span>
                </div>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                ⚡ Terapkan Otomatis ke Tabel di Bawah:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyVariantTemplate('bumbu')}
                  className="bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs px-3 py-1.5 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  Berat Timbangan (1 Ons s/d 1 kg)
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyVariantTemplate('sembako')}
                  className="bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-bold text-xs px-3 py-1.5 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  Sembako Karung (1/2 kg s/d 5 kg)
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyVariantTemplate('ikat')}
                  className="bg-white hover:bg-teal-50 text-teal-900 border border-teal-300 font-bold text-xs px-3 py-1.5 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-teal-600" />
                  Satuan Ikat (1 Ikat, 2 Ikat, 3 Ikat)
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyVariantTemplate('pcs')}
                  className="bg-white hover:bg-sky-50 text-sky-900 border border-sky-300 font-bold text-xs px-3 py-1.5 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-sky-600" />
                  Satuan Pcs / Buah / Pack
                </button>

                <button
                  type="button"
                  onClick={handleAddCustomVariant}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Tambah Baris Varian
                </button>
              </div>
            </div>

            {/* Toggle Pembelian Nominal Bebas (Custom Budget / Ecer) Langsung di Pengaturan Varian */}
            <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300/80 rounded-2xl space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <label className="font-extrabold text-xs text-amber-950 flex items-center gap-1.5 cursor-pointer">
                    <span className="text-sm">🥗</span>
                    <span>Izinkan Pembelian Custom Budget (Nominal Bebas / Eceran)</span>
                  </label>
                  <p className="text-[11px] text-amber-900/80">
                    Pelanggan bisa membeli sayur/produk ini dengan nominal budget sendiri (misal: Sawi Rp 2.000 walau harga standar 1 ikat Rp 5.000).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={tempAllowCustomBudget}
                  onChange={(e) => setTempAllowCustomBudget(e.target.checked)}
                  className="w-5 h-5 accent-emerald-600 rounded cursor-pointer shrink-0"
                />
              </div>

              {tempAllowCustomBudget && (
                <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-amber-950">
                    Minimal Pembelian Custom Budget (Rp):
                  </span>
                  <div className="w-36">
                    <input
                      type="number"
                      min="500"
                      step="500"
                      value={tempMinCustomBudget}
                      onChange={(e) => setTempMinCustomBudget(Number(e.target.value))}
                      className="w-full p-2 text-xs border border-amber-300 rounded-xl bg-white font-black text-right text-slate-900 shadow-2xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Variant Table */}
            {tempVariants.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Scale className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">
                  Belum ada varian berat timbangan untuk produk ini.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pelanggan saat ini memesan dengan satuan standar: <span className="font-bold">{variantTargetProduct.unit}</span>.
                </p>
                <div className="mt-3 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyVariantTemplate('bumbu')}
                    className="text-xs bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-xl"
                  >
                    Terapkan Template 1 Ons s/d 1 Kg
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="md:hidden flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-[11px] font-semibold">
                  <span>👉</span>
                  <span>Geser tabel ke samping untuk melihat rincian Modal, Harga Jual, Laba & Poin secara penuh.</span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                  <table className="min-w-[780px] w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3 min-w-[150px]">Label Varian</th>
                        <th className="py-2.5 px-2 min-w-[100px] w-28">Satuan</th>
                        <th className="py-2.5 px-2 min-w-[80px] w-20">Berat (g)</th>
                        <th className="py-2.5 px-3 min-w-[150px] w-40">Modal HPP (Rp)</th>
                        <th className="py-2.5 px-3 min-w-[150px] w-40">Harga Jual (Rp)</th>
                        <th className="py-2.5 px-3 min-w-[110px] text-center">Laba Toko</th>
                        <th className="py-2.5 px-3 min-w-[100px] text-center">1% Poin</th>
                        <th className="py-2.5 px-2 min-w-[45px] w-10 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {tempVariants.map((v, idx) => {
                        const vProfit = v.price - v.cost_price;
                        const vMargin = v.price > 0 ? (vProfit / v.price) * 100 : 0;
                        const vPoints = Math.max(0, Math.floor(vProfit * 0.07));

                        return (
                          <tr key={v.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            {/* 1. Name */}
                            <td className="py-2.5 px-3 min-w-[150px]">
                              <input
                                type="text"
                                value={v.name}
                                onChange={(e) => handleUpdateVariantRow(idx, 'name', e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:border-emerald-500 outline-none"
                                placeholder="Cth: 1 Ikat / 1/4 kg / 1 Pcs"
                              />
                            </td>

                            {/* 2. Unit Selection (berat, ikat, pcs, pack, buah, dll) */}
                            <td className="py-2.5 px-2 min-w-[100px]">
                              <select
                                value={v.unit || 'kg'}
                                onChange={(e) => {
                                  const selectedU = e.target.value;
                                  let uType: 'berat' | 'ikat' | 'pcs' | 'pack' | 'lainnya' = 'lainnya';
                                  if (selectedU === 'kg' || selectedU === 'gram' || selectedU === 'ons') uType = 'berat';
                                  else if (selectedU === 'ikat') uType = 'ikat';
                                  else if (selectedU === 'pcs' || selectedU === 'buah' || selectedU === 'butir') uType = 'pcs';
                                  else if (selectedU === 'pack' || selectedU === 'bungkus') uType = 'pack';
                                  
                                  setTempVariants((prev) => {
                                    const copy = [...prev];
                                    copy[idx] = { ...copy[idx], unit: selectedU, unit_type: uType };
                                    return copy;
                                  });
                                }}
                                className="w-full p-2 border border-slate-200 rounded-xl font-bold text-slate-700 text-xs bg-white focus:border-emerald-500 outline-none cursor-pointer"
                              >
                                <option value="kg">kg (Kilogram)</option>
                                <option value="gram">gram</option>
                                <option value="ons">ons (100g)</option>
                                <option value="ikat">ikat (Sayur)</option>
                                <option value="pcs">pcs (Biji/Buah)</option>
                                <option value="buah">buah</option>
                                <option value="pack">pack / bungkus</option>
                                <option value="butir">butir (Telur)</option>
                                <option value="porsi">porsi</option>
                              </select>
                            </td>

                            {/* 3. Weight in grams (Opsional jika pakai timbangan) */}
                            <td className="py-2.5 px-2 min-w-[80px]">
                              <input
                                type="number"
                                min="0"
                                value={v.weight_g || ''}
                                onChange={(e) => handleUpdateVariantRow(idx, 'weight_g', Number(e.target.value))}
                                className="w-full p-2 border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold focus:border-emerald-500 outline-none text-center"
                                placeholder="g (ops)"
                              />
                            </td>

                            {/* 3. Cost Price */}
                            <td className="py-2.5 px-3 min-w-[160px]">
                              <div className="space-y-1">
                                <div className="relative min-w-[130px]">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[11px]">Rp</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={v.cost_price || ''}
                                    onChange={(e) => handleUpdateVariantRow(idx, 'cost_price', Number(e.target.value))}
                                    className="w-full pl-8 pr-2 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:border-amber-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </div>
                                <span className="text-[11px] text-amber-800 font-extrabold block px-1 tracking-tight">
                                  {formatRupiah(v.cost_price || 0)}
                                </span>
                              </div>
                            </td>

                            {/* 4. Selling Price */}
                            <td className="py-2.5 px-3 min-w-[160px]">
                              <div className="space-y-1">
                                <div className="relative min-w-[130px]">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-[11px]">Rp</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={v.price || ''}
                                    onChange={(e) => handleUpdateVariantRow(idx, 'price', Number(e.target.value))}
                                    className="w-full pl-8 pr-2 py-2 border border-emerald-300 bg-emerald-50/20 rounded-xl font-black text-emerald-900 text-xs focus:border-emerald-600 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </div>
                                <span className="text-[11px] text-emerald-800 font-extrabold block px-1 tracking-tight">
                                  {formatRupiah(v.price || 0)}
                                </span>
                              </div>
                            </td>

                          {/* 5. Live Profit & Margin */}
                          <td className="py-2 px-3 text-center">
                            <div className="space-y-0.5">
                              <span className={`font-black text-xs block ${vProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {vProfit >= 0 ? `+${formatRupiah(vProfit)}` : formatRupiah(vProfit)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium block">
                                {vMargin.toFixed(0)}% margin
                              </span>
                            </div>
                          </td>

                          {/* 6. Live 1% Points */}
                          <td className="py-2 px-3 text-center">
                            <span className="bg-amber-100 text-amber-900 font-black text-xs px-2 py-0.5 rounded-lg inline-flex items-center gap-1 shadow-2xs">
                              <Coins className="w-3 h-3 fill-amber-400 text-amber-600" />
                              +{vPoints} Poin
                            </span>
                          </td>

                          {/* 7. Delete */}
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteVariantRow(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus varian ini"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {/* Note & Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div>
                {tempVariants.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Yakin ingin menghapus semua varian? Produk ini akan kembali menggunakan harga satuan standar saja.')) {
                        setTempVariants([]);
                      }
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold underline"
                  >
                    Kosongkan Semua Varian
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsVariantModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-medium text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSavingVariants}
                  onClick={handleSaveVariantsSubmit}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
                >
                  {isSavingVariants ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" /> Simpan Pengaturan Varian
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reward Item Add / Edit Modal */}
      {isRewardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto border border-slate-100">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-amber-100 text-amber-800 rounded-2xl">
                  <Gift className="w-5 h-5 text-amber-700" />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    {editingReward ? 'Edit Item Hadiah Koin' : 'Tambah Hadiah Koin Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atur nama, kategori, jumlah koin penukaran, dan stok hadiah.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRewardModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRewardSubmit} className="space-y-3.5 text-xs">
              {/* Name */}
              <div>
                <label className="font-bold block mb-1 text-slate-700">Nama Hadiah</label>
                <input
                  type="text"
                  required
                  placeholder="Cth: Minyak Sawit 1L, Wajan Teflon 20cm, Mini Chopper..."
                  value={rewardFormName}
                  onChange={(e) => setRewardFormName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-emerald-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="font-bold block mb-1 text-slate-700">Kategori Hadiah</label>
                <select
                  value={rewardFormCategory}
                  onChange={(e) => setRewardFormCategory(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 outline-none focus:border-emerald-500"
                >
                  <option value="Sembako">🌾 Sembako & Dapur (Beras, Minyak, Gula, Bumbu)</option>
                  <option value="Alat Rumah Tangga">🍳 Alat Rumah Tangga (Wajan, Pisau, Spatula)</option>
                  <option value="Elektronik">⚡ Elektronik Dapur & Rumah (Chopper, Teko, Timbangan)</option>
                  <option value="Voucher">🎟️ Voucher Belanja / Diskon</option>
                </select>
              </div>

              {/* Points & Stock Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-700 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-600" />
                    Koin Dibutuhkan
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Cth: 150"
                    value={rewardFormPoints || ''}
                    onChange={(e) => setRewardFormPoints(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-black text-amber-900 text-sm outline-none focus:border-emerald-500 bg-amber-50/50"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    1 Koin didapat dari 1% laba belanja
                  </span>
                </div>

                <div>
                  <label className="font-bold block mb-1 text-slate-700">Stok Tersedia</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="Cth: 20"
                    value={rewardFormStock}
                    onChange={(e) => setRewardFormStock(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Bisa dikurangi otomatis saat ditukar
                  </span>
                </div>
              </div>

              {/* Unit / Packaging */}
              <div>
                <label className="font-bold block mb-1 text-slate-700">
                  Keterangan Satuan / Kemasan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Cth: Pouch 1 Liter, 1 Set 5-in-1, 2.5 kg, 1 Pcs"
                  value={rewardFormUnit}
                  onChange={(e) => setRewardFormUnit(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="font-bold block mb-1 text-slate-700">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  placeholder="Cth: Wajan anti lengket praktis untuk sarapan atau ceplok telur sehari-hari."
                  value={rewardFormDesc}
                  onChange={(e) => setRewardFormDesc(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Photo Upload to Cloudflare R2 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold block text-slate-700">Foto Hadiah</label>
                  <span className="text-[10px] bg-sky-50 text-sky-600 font-semibold px-2 py-0.5 rounded-full border border-sky-100 flex items-center gap-1">
                    ☁️ Cloudflare R2
                  </span>
                </div>

                {rewardFormImageUrl && (
                  <div className="mb-2 relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img
                      src={rewardFormImageUrl}
                      alt="Preview Hadiah"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="URL gambar atau upload..."
                    value={rewardFormImageUrl}
                    onChange={(e) => setRewardFormImageUrl(e.target.value)}
                    className="flex-1 p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500"
                  />
                  <input
                    type="file"
                    ref={rewardFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleRewardFileUpload(file);
                    }}
                  />
                  <button
                    type="button"
                    disabled={isUploadingRewardImg}
                    onClick={() => rewardFileInputRef.current?.click()}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    {isUploadingRewardImg ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" /> Upload R2
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRewardModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReward || isUploadingRewardImg}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  {isSubmittingReward ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" /> Simpan Item Hadiah
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview Gambar (Bukti Pembayaran / Foto Tampak Depan Rumah) */}
      {previewImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${previewImageModal.isHousePhoto ? 'bg-sky-50 text-sky-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {previewImageModal.isHousePhoto ? <Home className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{previewImageModal.title}</h3>
                  <p className="text-[11px] text-slate-400">{previewImageModal.subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50 rounded-2xl p-2 flex items-center justify-center border border-slate-200/60 min-h-[300px]">
              <img
                src={previewImageModal.url}
                alt={previewImageModal.title}
                className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={previewImageModal.url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Buka Resolusi Penuh
              </a>
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Lengkap Pesanan, Alamat, Foto Rumah & Verifikasi Status */}
      {selectedOrderForAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[92vh] flex flex-col my-auto border border-slate-200">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
                  <Package className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      Detail Pesanan & Alamat
                    </h3>
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg border border-slate-200">
                      #{selectedOrderForAddressModal.order_number}
                    </span>
                    {getStatusBadge(selectedOrderForAddressModal.status)}
                    {selectedOrderForAddressModal.payment_status === 'paid' ? (
                      <span className="text-xs bg-emerald-100 text-emerald-900 font-black px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        LUNAS ({selectedOrderForAddressModal.payment_method.toUpperCase()})
                      </span>
                    ) : selectedOrderForAddressModal.payment_method === 'cod' ? (
                      <span className="text-xs bg-sky-100 text-sky-900 font-bold px-2 py-0.5 rounded-full border border-sky-200 flex items-center gap-1">
                        <Banknote className="w-3.5 h-3.5 text-sky-700" />
                        COD (Tagih Tunai)
                      </span>
                    ) : (
                      <span className="text-xs bg-amber-100 text-amber-950 font-black px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        BELUM LUNAS ({selectedOrderForAddressModal.payment_method.toUpperCase()})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Verifikasi status, rincian produk sayur, dan panduan alamat kurir pengantaran subuh.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForAddressModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* SECTION 1: VERIFIKASI STATUS PESANAN (Status Switcher & Verification) */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Verifikasi & Ubah Status Pesanan:</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Status Saat Ini: <strong className="text-slate-900 uppercase">{selectedOrderForAddressModal.status}</strong>
                  </span>
                </div>

                {/* 6 Status verification buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetOrderStatus(selectedOrderForAddressModal.id, 'pending')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                      selectedOrderForAddressModal.status === 'pending'
                        ? 'bg-amber-100/80 border-amber-400 text-amber-950 font-black ring-2 ring-amber-400 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-amber-50 hover:border-amber-300'
                    }`}
                  >
                    <span className="flex items-center justify-between text-xs font-bold">
                      <span>🟡 PO Pending</span>
                      {selectedOrderForAddressModal.status === 'pending' && <Check className="w-3.5 h-3.5 text-amber-700" />}
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Menunggu verifikasi admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetOrderStatus(selectedOrderForAddressModal.id, 'confirmed')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                      selectedOrderForAddressModal.status === 'confirmed'
                        ? 'bg-blue-100/80 border-blue-400 text-blue-950 font-black ring-2 ring-blue-400 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300'
                    }`}
                  >
                    <span className="flex items-center justify-between text-xs font-bold">
                      <span>🔵 Dikonfirmasi</span>
                      {selectedOrderForAddressModal.status === 'confirmed' && <Check className="w-3.5 h-3.5 text-blue-700" />}
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Pesanan diterima dapur</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetOrderStatus(selectedOrderForAddressModal.id, 'packing')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                      selectedOrderForAddressModal.status === 'packing'
                        ? 'bg-purple-100/80 border-purple-400 text-purple-950 font-black ring-2 ring-purple-400 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-purple-50 hover:border-purple-300'
                    }`}
                  >
                    <span className="flex items-center justify-between text-xs font-bold">
                      <span>🟣 Dikemas (Packing)</span>
                      {selectedOrderForAddressModal.status === 'packing' && <Check className="w-3.5 h-3.5 text-purple-700" />}
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Timbang & bungkus sayur</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetOrderStatus(selectedOrderForAddressModal.id, 'shipping')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                      selectedOrderForAddressModal.status === 'shipping'
                        ? 'bg-indigo-100/80 border-indigo-400 text-indigo-950 font-black ring-2 ring-indigo-400 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300'
                    }`}
                  >
                    <span className="flex items-center justify-between text-xs font-bold">
                      <span>🚚 Sedang Dikirim</span>
                      {selectedOrderForAddressModal.status === 'shipping' && <Check className="w-3.5 h-3.5 text-indigo-700" />}
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Dibawa armada kurir subuh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetOrderStatus(selectedOrderForAddressModal.id, 'completed')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                      selectedOrderForAddressModal.status === 'completed'
                        ? 'bg-emerald-100/80 border-emerald-400 text-emerald-950 font-black ring-2 ring-emerald-400 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300'
                    }`}
                  >
                    <span className="flex items-center justify-between text-xs font-bold">
                      <span>🟢 Selesai Terantar</span>
                      {selectedOrderForAddressModal.status === 'completed' && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Diterima pembeli dengan puas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetOrderStatus(selectedOrderForAddressModal.id, 'cancelled')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                      selectedOrderForAddressModal.status === 'cancelled'
                        ? 'bg-rose-100/80 border-rose-400 text-rose-950 font-black ring-2 ring-rose-400 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-rose-50 hover:border-rose-300'
                    }`}
                  >
                    <span className="flex items-center justify-between text-xs font-bold">
                      <span>🔴 Dibatalkan</span>
                      {selectedOrderForAddressModal.status === 'cancelled' && <Check className="w-3.5 h-3.5 text-rose-700" />}
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Batalkan pesanan</span>
                  </button>
                </div>

                {/* Payment Verification controls */}
                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-600">Verifikasi Pembayaran:</span>
                    {selectedOrderForAddressModal.payment_status === 'paid' ? (
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-lg border border-emerald-300">
                        Sudah Lunas
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-lg border border-amber-300">
                        Belum Lunas
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedOrderForAddressModal.payment_status !== 'paid' ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await handleAccPayment(selectedOrderForAddressModal);
                          setSelectedOrderForAddressModal({ ...selectedOrderForAddressModal, payment_status: 'paid' });
                        }}
                        disabled={isAccingPaymentId === selectedOrderForAddressModal.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isAccingPaymentId === selectedOrderForAddressModal.id ? 'Meng-ACC...' : 'ACC Pembayaran (Tandai Lunas)'}</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setPaidSuccessModalOrder(selectedOrderForAddressModal)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-white" />
                          <span>Kirim Struk Lunas WA</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePaymentStatus(selectedOrderForAddressModal)}
                          className="text-slate-600 hover:bg-slate-200 bg-white border border-slate-200 font-semibold px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                        >
                          Ubah ke Belum Lunas
                        </button>
                      </>
                    )}

                    {selectedOrderForAddressModal.payment_proof_url && (
                      <button
                        type="button"
                        onClick={() => setPreviewImageModal({
                          url: selectedOrderForAddressModal.payment_proof_url!,
                          title: 'Bukti Pembayaran / Transfer',
                          subtitle: `Diunggah oleh ${selectedOrderForAddressModal.customer_name} via aplikasi (${selectedOrderForAddressModal.payment_method.toUpperCase()})`,
                          isHousePhoto: false,
                        })}
                        className="bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                      >
                        📸 Cek Bukti Transfer
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: RINCIAN SAYUR & ITEM PESANAN */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span>Rincian Sayur & Belanjaan ({selectedOrderForAddressModal.items?.length || 0} macam):</span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    Jadwal Panen: {selectedOrderForAddressModal.po_date || 'Besok Subuh'} ({selectedOrderForAddressModal.delivery_slot})
                  </span>
                </div>

                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1">
                  {selectedOrderForAddressModal.items?.map((it, idx) => (
                    <div key={idx} className="py-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-800 font-bold flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">
                            {it.product_name}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {it.quantity} x {formatRupiah(it.price)} / {it.unit}
                          </span>
                        </div>
                      </div>
                      <span className="font-black text-slate-900 text-xs">
                        {formatRupiah(it.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500">Metode Bayar: <strong className="text-slate-800 uppercase">{selectedOrderForAddressModal.payment_method}</strong></span>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Total Tagihan:</span>
                    <span className="text-sm sm:text-base font-black text-emerald-700">
                      {formatRupiah(selectedOrderForAddressModal.total_amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: KONTAK & ALAMAT PENGANTARAN LENGKAP */}
              <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Nama Penerima:
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {selectedOrderForAddressModal.customer_name}
                    </span>
                    <p className="text-slate-600 font-medium text-xs">WhatsApp: {selectedOrderForAddressModal.customer_phone}</p>
                  </div>
                  <a
                    href={`https://wa.me/${selectedOrderForAddressModal.customer_phone.replace(/^0/, '62').replace(/\D/g, '')}?text=${encodeURIComponent(`Halo Kak ${selectedOrderForAddressModal.customer_name}, kami dari Admin/Kurir JogoPawon Mart sedang menyiapkan pengantaran pesanan Anda (${selectedOrderForAddressModal.order_number}).`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Chat WhatsApp</span>
                  </a>
                </div>

                {/* Alamat Lengkap */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Alamat Lengkap Pengantaran:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedOrderForAddressModal.delivery_address || '');
                        alert('Alamat berhasil disalin ke clipboard!');
                      }}
                      className="text-[10px] font-bold text-emerald-700 bg-white hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Copy className="w-3 h-3" /> Salin Alamat
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                    {selectedOrderForAddressModal.delivery_address || 'Tidak ada alamat lengkap tercantum.'}
                  </p>
                </div>

                {/* Patokan / Catatan Kurir */}
                {selectedOrderForAddressModal.delivery_note && (
                  <div className="bg-amber-50/90 border border-amber-300/80 rounded-xl p-3 text-amber-950 space-y-1">
                    <span className="font-black text-[11px] flex items-center gap-1 text-amber-900">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Patokan Rumah / Petunjuk Kurir Subuh:
                    </span>
                    <p className="font-medium text-xs leading-relaxed">
                      "{selectedOrderForAddressModal.delivery_note}"
                    </p>
                  </div>
                )}

                {/* Tombol Google Maps */}
                {(() => {
                  const noteText = selectedOrderForAddressModal.delivery_note || '';
                  const gpsMatch = noteText.match(/\[GPS:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)\]/);
                  const mapsQuery = gpsMatch
                    ? `${gpsMatch[1]},${gpsMatch[2]}`
                    : encodeURIComponent(selectedOrderForAddressModal.delivery_address + ' Pasuruan');

                  return (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-black text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer w-full shadow-2xs active:scale-98"
                    >
                      <ExternalLink className="w-4 h-4 text-emerald-600" />
                      <span>{gpsMatch ? '📍 Buka Titik GPS Akurat di Google Maps' : '🗺️ Buka Alamat di Google Maps'}</span>
                    </a>
                  );
                })()}
              </div>

              {/* SECTION 4: FOTO TAMPAK DEPAN RUMAH (Panduan Kurir) */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span>Foto Tampak Depan Rumah / Pagar (Panduan Visual Kurir Subuh):</span>
                </span>

                {selectedOrderForAddressModal.house_photo_url ? (
                  <div className="space-y-2">
                    <div className="relative group rounded-2xl overflow-hidden border-2 border-emerald-400 bg-slate-100 aspect-video shadow-xs flex items-center justify-center">
                      <img
                        src={selectedOrderForAddressModal.house_photo_url}
                        alt="Foto Rumah Pembeli"
                        className="w-full h-full object-cover"
                      />
                      <a
                        href={selectedOrderForAddressModal.house_photo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Lihat Resolusi Penuh</span>
                      </a>
                    </div>
                    <p className="text-[11px] text-slate-500 text-center">
                      Cocokkan bentuk pagar, cat rumah, atau pohon depan rumah pembeli dengan foto ini saat subuh.
                    </p>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-amber-300 bg-amber-50/50 rounded-2xl p-5 text-center space-y-1 text-amber-900">
                    <Camera className="w-7 h-7 text-amber-400 mx-auto" />
                    <p className="font-bold text-xs">Pembeli Belum Mengunggah Foto Rumah</p>
                    <p className="text-[10px] text-amber-700/80">
                      Gunakan alamat lengkap dan patokan di atas atau hubungi WhatsApp pembeli jika memerlukan panduan rumah.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer with Hapus & Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleDeleteOrderClick(selectedOrderForAddressModal)}
                className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 font-bold text-xs border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Hapus pesanan ini secara permanen dari database"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Hapus Pesanan Ini</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForInvoice(selectedOrderForAddressModal)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Struk</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOrderForAddressModal(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi ACC Pembayaran & Kirim Struk Lunas WA */}
      {paidSuccessModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-up">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-9 h-9" />
              </div>
              <h3 className="text-lg font-black text-slate-800">Pembayaran Berhasil di-ACC! 🎉</h3>
              <p className="text-xs text-slate-500">
                Pesanan <span className="font-bold text-slate-800">#{paidSuccessModalOrder.order_number}</span> kini berstatus <span className="font-bold text-emerald-600">LUNAS</span> dan siap diproses ke packing subuh.
              </p>
            </div>

            {/* Ringkasan Singkat Pesanan */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Nama Pelanggan:</span>
                <span className="font-bold text-slate-800">{paidSuccessModalOrder.customer_name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>No. WhatsApp:</span>
                <span className="font-medium text-slate-800">{paidSuccessModalOrder.customer_phone}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Metode Bayar:</span>
                <span className="font-bold text-slate-800">
                  {paidSuccessModalOrder.payment_method === 'qris'
                    ? 'QRIS All Payment'
                    : paidSuccessModalOrder.payment_method === 'cod'
                    ? 'COD (Bayar Tunai di Tempat)'
                    : 'Transfer Antar Bank'}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900 text-sm">
                <span>Total Lunas:</span>
                <span className="text-emerald-600">{formatRupiah(paidSuccessModalOrder.total_amount)}</span>
              </div>

              {paidSuccessModalOrder.points_earned !== undefined && paidSuccessModalOrder.points_earned > 0 && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-600" />
                    <span>Koin Loyalitas Terkirim:</span>
                  </span>
                  <span className="bg-amber-200/90 text-amber-950 font-black px-2 py-0.5 rounded-lg text-xs">
                    +{paidSuccessModalOrder.points_earned} Koin Masuk ke Akun!
                  </span>
                </div>
              )}
            </div>

            {/* Aksi Kirim Struk Lunas ke WA */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  window.open(generateStrukLunasWhatsAppUrl(paidSuccessModalOrder), '_blank');
                  setPaidSuccessModalOrder(null);
                }}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all active:scale-[0.98]"
              >
                <MessageCircle className="w-4 h-4 fill-white" /> Kirim Struk Lunas Resmi ke WhatsApp Pelanggan
              </button>
              <button
                type="button"
                onClick={() => setPaidSuccessModalOrder(null)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors text-center"
              >
                Tutup (Nanti Saja)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pengaturan Rumus Mesin Harga Pintar */}
      {isSmartConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 my-auto border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black shadow-xs">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Konfigurasi Mesin Harga Pintar
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Atur ambang batas laba minimal, buffer susut sayur, dan pembulatan psikologis.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSmartConfigModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveSmartConfig(smartConfig);
              }}
              className="space-y-4 text-xs"
            >
              {/* Parameter 1: Default Floor Margin */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span>1. Batas Minimal Keuntungan (Floor Margin):</span>
                  <span className="font-black text-emerald-700 font-mono text-sm">
                    Rp {smartConfig.defaultFloorMargin.toLocaleString('id-ID')}
                  </span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Jika keuntungan kotor suatu produk di bawah nominal ini, sistem otomatis memicu auto-markup.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  {[500, 700, 1000, 1500].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSmartConfig({ ...smartConfig, defaultFloorMargin: val })}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                        smartConfig.defaultFloorMargin === val
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Rp {val.toLocaleString('id-ID')}
                    </button>
                  ))}
                  <input
                    type="number"
                    step="100"
                    min="100"
                    value={smartConfig.defaultFloorMargin}
                    onChange={(e) => setSmartConfig({ ...smartConfig, defaultFloorMargin: Number(e.target.value) })}
                    className="w-24 px-2 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none"
                    title="Nominal custom"
                  />
                </div>
              </div>

              {/* Parameter 2: Pembulatan Psikologis */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span>2. Pembulatan Harga ke Atas (Psychological Rounding):</span>
                  <span className="font-black text-teal-700 font-mono">
                    Kelipatan Rp {smartConfig.roundingStep}
                  </span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Membulatkan harga ke atas agar bebas uang kembalian receh dan tampak rapi di mata ibu-ibu kampung.
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[100, 500, 1000].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setSmartConfig({ ...smartConfig, roundingStep: step })}
                      className={`p-2 rounded-xl font-bold border text-center transition-all ${
                        smartConfig.roundingStep === step
                          ? 'bg-teal-600 border-teal-600 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="block text-xs">Rp {step.toLocaleString('id-ID')}</span>
                      <span className="text-[9px] font-normal opacity-80">
                        {step === 500 ? '(Rekomendasi Pasar)' : step === 1000 ? '(Ribuan Bulat)' : '(Ratusan)'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Parameter 3: Buffer Susut & Biaya Kemas Toggles */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block">3. Biaya Operasional Riil (Kemas & Susut):</span>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smartConfig.includeShrinkage}
                    onChange={(e) => setSmartConfig({ ...smartConfig, includeShrinkage: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Hitung Buffer Susut Timbangan Sayur</span>
                    <span className="text-[11px] text-slate-500">
                      Otomatis tambahkan 8% pada sayur daun (akar kotor/daun kuning dibuang) dan 5% pada ayam/daging/cabai sebelum menghitung margin.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-slate-200">
                  <input
                    type="checkbox"
                    checked={smartConfig.includePackagingCost}
                    onChange={(e) => setSmartConfig({ ...smartConfig, includePackagingCost: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Hitung Biaya Plastik Seal & Stiker Label (+Rp 250)</span>
                    <span className="text-[11px] text-slate-500">
                      Menghindari keuntungan tergerus biaya kresek dan perlengkapan packing subuh.
                    </span>
                  </div>
                </label>
              </div>

              {/* Parameter 4: Sembako Patokan KVI */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span>4. Minimal Laba Sembako Patokan (Minyak, Beras, Telur):</span>
                  <span className="font-black text-amber-700 font-mono">
                    Rp {smartConfig.kviFloorMargin.toLocaleString('id-ID')}
                  </span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Bisa diset lebih tipis (misal Rp 500) agar harga sembako utama tetap bersaing dengan warung kampung.
                </p>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={smartConfig.kviFloorMargin}
                  onChange={(e) => setSmartConfig({ ...smartConfig, kviFloorMargin: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none"
                />
              </div>

              {/* Parameter Khusus: Deteksi Hanya Produk Kiloan */}
              <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="font-bold text-emerald-950 block text-xs">
                      Deteksi Batas Laba Hanya untuk Satuan Kg
                    </label>
                    <p className="text-[11px] text-emerald-800/80">
                      Aktif: Aturan minimal laba Rp {smartConfig.defaultFloorMargin.toLocaleString('id-ID')} hanya berlaku untuk produk /kg. Satuan non-kg (ikat, pack, pcs, dll) tidak dibatasi.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={smartConfig.onlyKgDetection}
                    onChange={(e) => setSmartConfig({ ...smartConfig, onlyKgDetection: e.target.checked })}
                    className="w-5 h-5 accent-emerald-600 rounded cursor-pointer shrink-0"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSmartConfig(DEFAULT_SMART_CONFIG)}
                  className="text-slate-500 hover:text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Reset Default (Rp 500 / Khusus Kg)
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSmartConfigModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    Simpan Konfigurasi
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Broadcast Push Notification ke HP Pelanggan */}
      {isPushModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Kirim Notifikasi ke HP Pelanggan</h3>
                  <p className="text-xs text-slate-500">Muncul langsung di status bar / lockscreen HP pelanggan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPushModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSendingPush(true);
                try {
                  const res = await api.sendPushBroadcast({
                    title: pushTitle,
                    body: pushBody,
                    url: pushUrl,
                    category: 'promo',
                  });
                  setPushResultToast({ success: true, message: `Berhasil dikirim ke ${res.subscriber_count || 'semua'} pelanggan!` });
                  setTimeout(() => {
                    setIsPushModalOpen(false);
                    setPushResultToast(null);
                  }, 2000);
                } catch (err: any) {
                  setPushResultToast({ success: false, message: err.message || 'Gagal mengirim notifikasi' });
                } finally {
                  setIsSendingPush(false);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="font-bold block mb-1 text-slate-700">Judul Notifikasi</label>
                <input
                  type="text"
                  required
                  placeholder="Cth: 🥬 Panen Subuh Tiba! Bayam & Kangkung Segar Diskon"
                  value={pushTitle}
                  onChange={(e) => setPushTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-700">Isi Pesan Notifikasi</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Cth: Bumbu pawon komplit dan ayam potong segar sudah siap dipesan untuk diantar subuh besok. Yuk order sekarang bu!"
                  value={pushBody}
                  onChange={(e) => setPushBody(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-700">Tautan Tujuan Ketika Notifikasi Diklik (URL)</label>
                <input
                  type="text"
                  placeholder="/"
                  value={pushUrl}
                  onChange={(e) => setPushUrl(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-mono text-slate-700 outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Contoh: <code>/</code> (Halaman Utama), <code>#katalog</code>, atau <code>#koin</code>
                </span>
              </div>

              {pushResultToast && (
                <div className={`p-3 rounded-xl font-bold text-xs flex items-center gap-2 ${pushResultToast.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                  {pushResultToast.success ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                  <span>{pushResultToast.message}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPushModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSendingPush}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isSendingPush ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengirim ke Seluruh HP...</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      <span>Kirim Siaran ke HP Pelanggan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kalkulator Konversi Laba Eceran (Ons ke Kg) */}
      <KgOnsProfitCalculatorModal
        isOpen={isKgOnsModalOpen}
        onClose={() => {
          setIsKgOnsModalOpen(false);
          setCalculatorTargetProduct(null);
        }}
        initialProduct={calculatorTargetProduct}
        products={products}
        onApplyRetailVariant={handleApplyRetailVariant}
      />

      {/* Toast Notification Banner */}
      {rewardToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-slide-up">
          <span className="p-1 bg-emerald-500 rounded-full text-white">
            <Check className="w-3.5 h-3.5" />
          </span>
          {rewardToast}
        </div>
      )}
    </div>
  );
};
