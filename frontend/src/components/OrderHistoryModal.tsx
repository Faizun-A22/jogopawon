import React, { useState, useEffect, useCallback } from 'react';
import { Order, OrderStatus, User } from '../types';
import { api, realtime } from '../services/api';
import {
  X,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  CheckCheck,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  ShoppingBag,
  MessageCircle,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  MapPin,
  Calendar,
  Banknote,
  QrCode,
  CreditCard,
  Copy,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSelectOrder: (order: Order) => void;
  onReorder?: (order: Order) => void;
  onOpenStore?: () => void;
}

type OrderTabFilter = 'all' | 'active' | 'completed' | 'cancelled';

export const OrderHistoryModal: React.FC<OrderHistoryModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectOrder,
  onReorder,
  onOpenStore,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<OrderTabFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formatRupiah = (val: number) => 'Rp' + (val || 0).toLocaleString('id-ID');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Ambil dari server
      const userPhone = currentUser?.phone || '';
      let fetched: Order[] = [];
      try {
        fetched = await api.getCustomerOrders(userPhone);
      } catch {
        fetched = await api.getAdminOrders().catch(() => []);
      }

      // 2. Ambil ID pesanan yang pernah dibuat di browser ini dari localStorage
      let localOrderNumbers: string[] = [];
      try {
        const stored = localStorage.getItem('jogopawon_customer_orders');
        if (stored) {
          localOrderNumbers = JSON.parse(stored);
        }
      } catch {}

      // 3. Filter agar relevan dengan user / device saat ini
      let matchedOrders = fetched;
      if (userPhone) {
        const cleanPhone = userPhone.replace(/[^0-9]/g, '');
        matchedOrders = fetched.filter((o) => {
          const oPhone = (o.customer_phone || '').replace(/[^0-9]/g, '');
          const phoneMatch = oPhone === cleanPhone || (cleanPhone.length >= 9 && oPhone.endsWith(cleanPhone.slice(-9)));
          const localMatch = localOrderNumbers.includes(o.order_number) || localOrderNumbers.includes(o.id);
          return phoneMatch || localMatch;
        });
      } else if (localOrderNumbers.length > 0) {
        matchedOrders = fetched.filter((o) => localOrderNumbers.includes(o.order_number) || localOrderNumbers.includes(o.id));
      }

      // Urutkan pesanan terbaru di paling atas
      matchedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setOrders(matchedOrders);
    } catch (e) {
      console.warn('Gagal memuat riwayat pesanan:', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.phone]);

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen, fetchOrders]);

  // Realtime WebSocket & Visibility Listener
  useEffect(() => {
    if (!isOpen) return;

    const unsub = realtime.subscribe((msg) => {
      if (msg.event === 'ORDER_STATUS_UPDATED' || msg.event === 'NEW_ORDER') {
        fetchOrders();
      }
    });

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchOrders();
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      unsub();
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [isOpen, fetchOrders]);

  if (!isOpen) return null;

  // Filter orders by tab & search query
  const filteredOrders = orders.filter((order) => {
    // Tab filter
    if (activeTab === 'active') {
      if (order.status === 'completed' || order.status === 'cancelled') return false;
    } else if (activeTab === 'completed') {
      if (order.status !== 'completed') return false;
    } else if (activeTab === 'cancelled') {
      if (order.status !== 'cancelled') return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = order.order_number.toLowerCase().includes(q);
      const matchItems = (order.items || []).some((it) => it.product_name.toLowerCase().includes(q));
      const matchAddress = (order.delivery_address || '').toLowerCase().includes(q);
      return matchNumber || matchItems || matchAddress;
    }

    return true;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-300 font-extrabold px-2.5 py-0.5 rounded-full text-[10px]">
            <Clock className="w-3 h-3 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
            <span>Menunggu Konfirmasi</span>
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-900 border border-blue-300 font-extrabold px-2.5 py-0.5 rounded-full text-[10px]">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            <span>Dikonfirmasi Toko</span>
          </span>
        );
      case 'packing':
        return (
          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-900 border border-indigo-300 font-extrabold px-2.5 py-0.5 rounded-full text-[10px]">
            <Package className="w-3 h-3 text-indigo-600" />
            <span>Ditimbang & Dikemas</span>
          </span>
        );
      case 'shipping':
        return (
          <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-900 border border-teal-300 font-extrabold px-2.5 py-0.5 rounded-full text-[10px]">
            <Truck className="w-3 h-3 text-teal-600" />
            <span>Sedang Diantar Kurir</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-900 border border-emerald-300 font-extrabold px-2.5 py-0.5 rounded-full text-[10px]">
            <CheckCheck className="w-3 h-3 text-emerald-600" />
            <span>Pesanan Selesai</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 bg-red-50 text-red-900 border border-red-300 font-extrabold px-2.5 py-0.5 rounded-full text-[10px]">
            <AlertCircle className="w-3 h-3 text-red-600" />
            <span>Dibatalkan</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
            {status}
          </span>
        );
    }
  };

  const getPaymentBadge = (order: Order) => {
    if (order.payment_status === 'paid') {
      return (
        <span className="text-[10px] bg-emerald-100 text-emerald-900 font-black px-2 py-0.5 rounded-md">
          LUNAS
        </span>
      );
    }
    if (order.payment_method === 'cod') {
      return (
        <span className="text-[10px] bg-sky-100 text-sky-900 font-bold px-2 py-0.5 rounded-md">
          COD (Bayar di Tempat)
        </span>
      );
    }
    return (
      <span className="text-[10px] bg-amber-100 text-amber-950 font-bold px-2 py-0.5 rounded-md">
        Belum Dibayar
      </span>
    );
  };

  const handleCopyOrderNumber = (e: React.MouseEvent, num: string) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(num);
    setCopiedId(num);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleChatAdmin = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    const text = encodeURIComponent(
      `Halo Admin JogoPawon Mart, saya ingin menanyakan tentang pesanan saya ${order.order_number} (${order.customer_name}) status saat ini: ${order.status.toUpperCase()}. Terima kasih!`
    );
    window.open(`https://wa.me/6289654190596?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const activeCount = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative z-10 w-full max-w-2xl bg-slate-50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-white border-b border-slate-200/80 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">Riwayat Pesanan Saya</h2>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {orders.length} Pesanan
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Lacak status panen, pengiriman subuh, dan riwayat pesanan Anda
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fetchOrders()}
              title="Muat ulang riwayat"
              className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar & Tabs */}
        <div className="bg-white border-b border-slate-200 px-4 pt-3 pb-3 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari No. Order, nama sayur, atau alamat..."
              className="w-full bg-slate-100 focus:bg-white pl-9 pr-9 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Semua ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'active'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <span>Sedang Diproses</span>
              {activeCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    activeTab === 'active' ? 'bg-white text-emerald-900' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {activeCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'completed'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <span>Selesai</span>
              {completedCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    activeTab === 'completed' ? 'bg-white text-emerald-900' : 'bg-slate-300 text-slate-800'
                  }`}
                >
                  {completedCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cancelled')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'cancelled'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Dibatalkan
            </button>
          </div>
        </div>

        {/* Content List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Memuat riwayat pesanan Anda...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-slate-800">
                {activeTab === 'active'
                  ? 'Tidak ada pesanan yang sedang diproses'
                  : activeTab === 'completed'
                  ? 'Belum ada pesanan yang selesai'
                  : activeTab === 'cancelled'
                  ? 'Tidak ada pesanan yang dibatalkan'
                  : 'Belum Ada Riwayat Pesanan'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Setiap sayur atau sembako yang Anda pesan akan tercatat rapi di sini lengkap dengan live status pengiriman dan struk digital.
              </p>
              {onOpenStore && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenStore();
                  }}
                  className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <span>Mulai Belanja Sayur Subuh</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            filteredOrders.map((order) => {
              const itemsCount = (order.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);
              const previewItems = (order.items || []).slice(0, 2);
              const moreCount = (order.items || []).length - 2;

              return (
                <motion.div
                  key={order.id || order.order_number}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    onClose();
                    onSelectOrder(order);
                  }}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer space-y-3 group"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-black text-xs sm:text-sm text-slate-900 truncate">
                          {order.order_number}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyOrderNumber(e, order.order_number)}
                          title="Salin nomor pesanan"
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {copiedId === order.order_number ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                        {order.created_at
                          ? new Date(order.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Baru saja'}
                      </span>
                    </div>
                    <div className="shrink-0">{getStatusBadge(order.status)}</div>
                  </div>

                  {/* Delivery Info Snippet */}
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-xl">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      <strong>Jadwal Antar:</strong> {order.po_date || order.delivery_date || 'Besok Subuh'} ({order.delivery_slot})
                    </span>
                  </div>

                  {/* Items Preview */}
                  <div className="space-y-2">
                    {previewItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <img
                          src={item.product_image || '/logo.webp'}
                          alt={item.product_name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{item.product_name}</p>
                          <p className="text-[11px] text-slate-500">
                            {item.quantity}x {item.variant_name ? `(${item.variant_name})` : `(${item.unit})`} • {formatRupiah(item.subtotal)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {moreCount > 0 && (
                      <p className="text-[11px] font-bold text-slate-500 pl-13">
                        +{moreCount} barang belanjaan lainnya
                      </p>
                    )}
                  </div>

                  {/* Total & Action Bar */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">Total Tagihan:</span>
                        {getPaymentBadge(order)}
                      </div>
                      <span className="text-base font-black text-emerald-700">
                        {formatRupiah(order.total_amount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleChatAdmin(e, order)}
                        className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Chat WhatsApp Admin mengenai pesanan ini"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">WA Admin</span>
                      </button>

                      {onReorder && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReorder(order);
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Pesan ulang belanjaan yang sama"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                          <span>Pesan Lagi</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectOrder(order);
                        }}
                        className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-emerald-600 group-hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                      >
                        <span>Lacak Detail</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
};
