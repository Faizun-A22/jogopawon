import React, { useState, useEffect, useCallback } from 'react';
import { Order, OrderStatus } from '../types';
import { X, CheckCircle, Package, Truck, CheckCheck, Clock, MapPin, Phone, Radio, MessageCircle, Coins, CheckCircle2, Banknote, QrCode, CreditCard, Download, ExternalLink, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { api, realtime } from '../services/api';

interface OrderTrackingModalProps {
  order: Order | null;
  onClose: () => void;
  onOrderUpdated?: (order: Order) => void;
  onOpenOrderHistory?: () => void;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  order: initialOrder,
  onClose,
  onOrderUpdated,
  onOpenOrderHistory,
}) => {
  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Baru saja');

  // Sinkronkan state lokal jika props berubah
  useEffect(() => {
    if (initialOrder) {
      setOrder(initialOrder);
    }
  }, [initialOrder]);

  // Fungsi fetch status pesanan terkini dari server
  const fetchLatestStatus = useCallback(async (showSpin = false) => {
    const targetId = order?.id || order?.order_number || initialOrder?.id || initialOrder?.order_number;
    if (!targetId) return;

    if (showSpin) setIsRefreshing(true);
    try {
      const latest = await api.getOrder(targetId);
      if (latest) {
        setOrder(latest);
        setLastSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        if (onOrderUpdated) onOrderUpdated(latest);
      }
    } catch (e) {
      console.warn('[TrackingModal] Gagal auto-refresh order:', e);
    } finally {
      if (showSpin) setIsRefreshing(false);
    }
  }, [order?.id, order?.order_number, initialOrder?.id, initialOrder?.order_number, onOrderUpdated]);

  // 1. WebSocket Live Listener
  useEffect(() => {
    const targetId = order?.id || order?.order_number;
    if (!targetId) return;

    const unsub = realtime.subscribe((msg) => {
      if (msg.event === 'ORDER_STATUS_UPDATED') {
        const updated = msg.payload as Order;
        if (updated && (updated.id === order?.id || updated.order_number === order?.order_number)) {
          setOrder(updated);
          setLastSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          if (onOrderUpdated) onOrderUpdated(updated);
        }
      }
    });

    return () => unsub();
  }, [order?.id, order?.order_number, onOrderUpdated]);

  // 2. Active Polling Fallback (setiap 2.5 detik selama modal terbuka)
  // Menjamin jika koneksi WebSocket di HP terputus/terlelap, tampilan tetap terupdate otomatis
  useEffect(() => {
    const targetId = order?.id || order?.order_number;
    if (!targetId) return;

    // Ambil data terbaru langsung saat modal terbuka
    fetchLatestStatus(false);

    const interval = setInterval(() => {
      fetchLatestStatus(false);
    }, 2500);

    return () => clearInterval(interval);
  }, [fetchLatestStatus, order?.id, order?.order_number]);

  // 3. Tab Visibility & Window Focus Listener
  // Ketika user kembali dari tab Admin atau aplikasi WA ke tab Pelanggan, langsung refresh seketika!
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchLatestStatus(true);
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [fetchLatestStatus]);

  if (!order) return null;

  const steps: { key: OrderStatus; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      key: 'pending',
      label: 'Pesanan Diterima',
      desc: 'Pesanan masuk ke sistem antrian panen/toko',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      key: 'confirmed',
      label: 'Dikonfirmasi',
      desc: 'Stok sayur dipastikan siap untuk subuh',
      icon: <CheckCircle className="w-4 h-4" />,
    },
    {
      key: 'packing',
      label: 'Ditimbang & Dikemas',
      desc: 'Sayur segar dipilah, ditimbang, dan dimasukkan cool-box',
      icon: <Package className="w-4 h-4" />,
    },
    {
      key: 'shipping',
      label: 'Sedang Diantar Kurir',
      desc: 'Kurir sedang dalam perjalanan ke alamat Anda',
      icon: <Truck className="w-4 h-4" />,
    },
    {
      key: 'completed',
      label: 'Tiba & Selesai',
      desc: 'Sayur segar diterima dengan baik di rumah',
      icon: <CheckCheck className="w-4 h-4" />,
    },
  ];

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 0;
      case 'confirmed': return 1;
      case 'packing': return 2;
      case 'shipping': return 3;
      case 'completed': return 4;
      case 'cancelled': return -1;
      default: return 0;
    }
  };

  const currentStepIdx = getStepIndex(order.status);
  const formatRupiah = (val: number) => 'Rp' + (val || 0).toLocaleString('id-ID');

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden pointer-events-auto"
      >
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-green-600 text-white p-4 sm:p-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                Status Pesanan
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-100 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping inline-block" />
                <Radio className="w-3 h-3 text-red-300 animate-pulse" />
                <span>Live Real-time</span>
                <span className="text-[10px] text-emerald-200 opacity-90">({lastSyncTime})</span>
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <h2 className="text-base sm:text-lg font-black">{order.order_number}</h2>
              <button
                type="button"
                onClick={() => fetchLatestStatus(true)}
                title="Perbarui status sekarang"
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90 flex items-center gap-1 text-[10px] font-semibold px-2"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            aria-label="Tutup status pesanan"
            className="w-10 h-10 -mr-1 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs select-none touch-manipulation"
          >
            <X className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* REAL-TIME PAYMENT STATUS CARD */}
          {order.payment_status === 'paid' ? (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-xs space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-900 flex items-center gap-1.5 text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Pembayaran Lunas (Terverifikasi)
                </span>
                <span className="bg-emerald-200 text-emerald-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                  {order.payment_method} - LUNAS
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Pembayaran Anda sebesar <strong>{formatRupiah(order.total_amount)}</strong> telah diverifikasi dan di-ACC oleh admin JogoPawon. Sayur segar Anda siap dipanen & diantar subuh!
              </p>
            </div>
          ) : order.payment_method === 'cod' ? (
            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3.5 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-900 flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-sky-600" />
                  Metode: COD (Bayar Tunai di Tempat)
                </span>
                <span className="bg-sky-200/80 text-sky-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Siapkan Uang Pas
                </span>
              </div>
              <p className="text-[11px] text-sky-800 leading-relaxed">
                Tagihan sebesar <strong>{formatRupiah(order.total_amount)}</strong> dibayarkan tunai ke kurir saat paket sayur subuh tiba di alamat Anda.
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-amber-950 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Menunggu Pembayaran & Verifikasi Admin
                </span>
                <span className="bg-amber-200 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                  Belum Di-ACC
                </span>
              </div>
              <p className="text-[11px] text-amber-900/90 leading-relaxed">
                Total Tagihan: <strong className="text-amber-950 font-black">{formatRupiah(order.total_amount)}</strong> ({order.payment_method.toUpperCase()}).
                {order.payment_proof_url
                  ? ' Bukti transfer Anda sudah diterima sistem dan sedang diperiksa oleh admin.'
                  : ' Mohon lakukan transfer/scan QRIS dan kirimkan bukti bayar agar admin dapat segera meng-ACC pesanan Anda.'}
              </p>

              {order.payment_method === 'qris' && (
                <div className="bg-white p-3 rounded-2xl border border-amber-200 text-center space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-amber-600" />
                      <span>Barcode QRIS JogoPawon Sembako</span>
                    </span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      ID1026616559690
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-dashed border-amber-300 max-w-[190px] mx-auto">
                    <img
                      src="/qris_jogopawon.jpg"
                      alt="QRIS JogoPawon Sembako"
                      className="w-44 h-auto object-contain rounded-lg mx-auto shadow-2xs"
                    />
                    <div className="text-[9px] text-slate-500 font-mono mt-1 text-center">
                      JOGOPAWON, SEMBAKO • A01
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-0.5">
                    <a
                      href="/qris_jogopawon.jpg"
                      download="QRIS_JogoPawon_Sembako.jpg"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Download className="w-3 h-3 text-amber-700" />
                      Unduh QRIS
                    </a>
                    <a
                      href="/qris_jogopawon.jpg"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Perbesar
                    </a>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  const msg = encodeURIComponent(`Halo Admin JogoPawon Mart, saya ingin konfirmasi/kirim bukti pembayaran untuk No. Order ${order.order_number} (${order.customer_name}) sebesar ${formatRupiah(order.total_amount)}. Terima kasih!`);
                  window.open(`https://wa.me/6289654190596?text=${msg}`, '_blank', 'noopener,noreferrer');
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-white" />
                <span>Kirim Bukti Pembayaran ke WA Admin</span>
              </button>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Lacak Pengiriman Sayur
            </h3>

            <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {steps.map((step, idx) => {
                const isPassed = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;

                return (
                  <div key={step.key} className="flex items-start gap-4 relative z-10">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-bold transition-all shadow-sm ${
                        isCurrent
                          ? 'bg-emerald-600 ring-4 ring-emerald-100 scale-110 animate-pulse-fast'
                          : isPassed
                          ? 'bg-emerald-500'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {step.icon}
                    </div>

                    <div className="flex-1 pt-0.5">
                      <div className="flex items-center justify-between">
                        <h4
                          className={`text-xs font-extrabold ${
                            isCurrent
                              ? 'text-emerald-700 text-sm'
                              : isPassed
                              ? 'text-slate-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {step.label}
                        </h4>
                        {isCurrent && (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                            Sedang Berlangsung
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery & Customer Info */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-700">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <Clock className="w-3.5 h-3.5" />
                Slot Pengantaran:
              </span>
              <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md font-black">
                {order.delivery_slot}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200/60 space-y-1">
              <div className="flex items-start gap-2 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800">{order.customer_name}</span> ({order.customer_phone})
                  <p className="text-[11px] text-slate-500">{order.delivery_address}</p>
                  {order.delivery_note && (
                    <p className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1">
                      Catatan: "{order.delivery_note}"
                    </p>
                  )}
                  {order.house_photo_url && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 flex items-center justify-between">
                        <span>🏠 Foto Tampak Rumah (Panduan Kurir):</span>
                        <span className="text-[9px] text-slate-400 font-normal">Klik untuk perbesar ↗</span>
                      </p>
                      <a href={order.house_photo_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={order.house_photo_url}
                          alt="Tampak Rumah"
                          className="w-full h-28 object-cover hover:opacity-90 transition-opacity cursor-pointer"
                        />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Items Summary */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Rincian Belanjaan ({order.items?.length || 0} Barang)
            </h4>
            <div className="space-y-2">
              {order.items?.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
                  <div className="flex items-center gap-2">
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                    <div>
                      <span className="font-bold text-slate-800">{item.product_name}</span>
                      <p className="text-[10px] text-slate-400">
                        {item.quantity} x {formatRupiah(item.price)} /{item.unit}
                      </p>
                    </div>
                  </div>
                  <span className="font-black text-slate-700">{formatRupiah(item.subtotal)}</span>
                </div>
              ))}
            </div>

            {order.points_earned !== undefined && order.points_earned > 0 && (
              <div className="flex items-center justify-between text-xs bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 text-amber-900 font-bold">
                <div>
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 fill-amber-400 text-amber-600 animate-pulse" />
                    <span>Koin Pawon (+{order.points_earned}):</span>
                  </span>
                  <span className="text-[10px] text-amber-800/80 font-medium block mt-0.5">
                    {order.payment_status === 'paid' || order.points_awarded
                      ? '✅ Telah masuk ke saldo akun'
                      : '⏳ Otomatis masuk setelah pembayaran Lunas'}
                  </span>
                </div>
                <span className="text-amber-800 font-black shrink-0">+{order.points_earned} Koin</span>
              </div>
            )}

            <div className="pt-2 flex justify-between font-black text-sm text-slate-900 border-t border-slate-100">
              <span>Total Tagihan ({order.payment_method.toUpperCase()}):</span>
              <span className="text-emerald-700">{formatRupiah(order.total_amount)}</span>
            </div>

            {/* Direct WhatsApp Contact Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  const itemsSummary = (order.items || [])
                    .map((it) => `• ${it.quantity}x ${it.product_name} (${it.unit}) - ${formatRupiah(it.subtotal)}`)
                    .join('\n');
                  const msg = encodeURIComponent(
                    `Halo Admin JogoPawon Mart, saya ingin bertanya mengenai pesanan saya:\n\n` +
                    `📋 *No. Order*   : ${order.order_number}\n` +
                    `👤 *Nama Pemesan*: ${order.customer_name} (${order.customer_phone})\n` +
                    `📍 *Alamat Kirim*: ${order.delivery_address}\n` +
                    `📦 *Jadwal Antar*: ${order.po_date || order.delivery_date || '-'} (${order.delivery_slot || 'Subuh'})\n` +
                    `💵 *Total Tagihan*: *${formatRupiah(order.total_amount)}*\n` +
                    `💳 *Metode Bayar*: ${order.payment_method?.toUpperCase()} (${order.payment_status === 'paid' ? 'LUNAS' : 'BELUM LUNAS'})\n` +
                    `⏳ *Status Saat Ini*: *${order.status?.toUpperCase()}*\n\n` +
                    `🛒 *Rincian Belanja:*\n${itemsSummary}\n\n` +
                    `Mohon bantuannya ya min, terima kasih! 🙏`
                  );
                  window.open(`https://wa.me/6289654190596?text=${msg}`, '_blank', 'noopener,noreferrer');
                }}
                className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold py-2.5 px-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                <span>Chat Admin WhatsApp untuk Pesanan Ini</span>
              </button>
            </div>

            {/* Tombol Batalkan Pesanan (Hanya jika belum bayar dan belum dikonfirmasi) */}
            {(() => {
              const currStatus = (order.status || '').toLowerCase().trim();
              const isNotConfirmed = currStatus === 'pending' || currStatus === 'menunggu konfirmasi' || currStatus === '';
              const isNotPaid = order.payment_status !== 'paid';
              const canCancel = isNotConfirmed && isNotPaid;

              if (currStatus === 'cancelled') {
                return (
                  <div className="pt-1">
                    <div className="w-full bg-rose-50 border border-rose-200 text-rose-800 text-xs py-2 px-3 rounded-2xl text-center font-bold">
                      Pesanan ini telah dibatalkan
                    </div>
                  </div>
                );
              }

              if (canCancel) {
                return (
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={async () => {
                        const confirmed = window.confirm(
                          `Apakah Anda yakin ingin membatalkan pesanan #${order.order_number}?\n\nPesanan yang dibatalkan tidak akan diproses atau dikirim.`
                        );
                        if (!confirmed) return;
                        setIsCancelling(true);
                        try {
                          const updated = await api.cancelOrder(order.id || order.order_number);
                          setOrder(updated);
                          if (onOrderUpdated) onOrderUpdated(updated);
                          alert('Pesanan Anda berhasil dibatalkan.');
                        } catch (err: any) {
                          alert(err.message || 'Gagal membatalkan pesanan. Hubungi admin WhatsApp.');
                        } finally {
                          setIsCancelling(false);
                        }
                      }}
                      className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold py-2.5 px-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {isCancelling ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Membatalkan Pesanan...</span>
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4 text-rose-600" />
                          <span>Batalkan Pesanan Ini (Belum Bayar / Menunggu Konfirmasi)</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              }

              return null;
            })()}

            {onOpenOrderHistory && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenOrderHistory();
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200/90 text-slate-700 font-bold py-2.5 px-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span>Lihat Semua Riwayat Pesanan Saya</span>
                </button>
              </div>
            )}

            {/* Tombol Tutup Cadangan di Bawah */}
            <div className="pt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 font-bold py-2.5 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Tutup Jendela Status Pesanan</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
