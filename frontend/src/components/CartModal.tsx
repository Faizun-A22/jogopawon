import React, { useState, useEffect, useMemo } from 'react';
import { Product, OrderItem, DeliverySlot, Order, User, CartItem, ProductVariant, UserAddress } from '../types';
import {
  X,
  Trash2,
  Plus,
  Minus,
  Clock,
  MapPin,
  Phone,
  User as UserIcon,
  CheckCircle2,
  ShoppingBag,
  ShieldCheck,
  CreditCard,
  Banknote,
  QrCode,
  Lock,
  Coins,
  Scale,
  Home,
  Star,
  ChevronDown,
  Check,
  ExternalLink,
  Camera,
  Navigation,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  deliverySlots: DeliverySlot[];
  onUpdateQuantity: (productId: string, delta: number, variantId?: string) => void;
  onRemoveItem: (productId: string, variantId?: string) => void;
  onClearCart: () => void;
  onSubmitOrder: (orderData: Partial<Order>) => Promise<Order>;
  onOrderSuccess: (order: Order) => void;
  currentUser?: User | null;
  onRequireAuth?: () => void;
  onGoToProfileAddress?: () => void;
}

export const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  onClose,
  cart,
  deliverySlots,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onSubmitOrder,
  onOrderSuccess,
  currentUser,
  onRequireAuth,
  onGoToProfileAddress,
}) => {
  const todayDate = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];

  const hasPoItems = cart.some((item) => item.product.stock <= 0);
  const allItemsReady = cart.length > 0 && cart.every((item) => item.product.stock > 0);

  const [deliveryType, setDeliveryType] = useState<'sameday' | 'po'>('po');
  const [poDate, setPoDate] = useState<string>(tomorrowDate);
  const [selectedSlot, setSelectedSlot] = useState<string>('06:00 - 08:00 WIB');
  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '');
  const [deliveryNote, setDeliveryNote] = useState(currentUser?.note || '');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'qris' | 'bank_transfer'>('cod');
  const [referralCodeInput, setReferralCodeInput] = useState(currentUser?.referred_by || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sinkronisasi daftar alamat tersimpan pengguna
  const savedAddresses: UserAddress[] = useMemo(() => {
    if (currentUser?.saved_addresses && Array.isArray(currentUser.saved_addresses)) {
      return currentUser.saved_addresses;
    }
    if (currentUser?.address && currentUser.address.trim()) {
      return [
        {
          id: 'addr-primary',
          label: 'Rumah Utama',
          recipient_name: currentUser.name || '',
          phone: currentUser.phone || '',
          address: currentUser.address,
          landmark: currentUser.landmark || currentUser.note || '',
          house_photo_url: currentUser.house_photo_url || '',
          is_primary: true,
        },
      ];
    }
    return [];
  }, [currentUser]);

  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isChangingAddress, setIsChangingAddress] = useState(false);

  useEffect(() => {
    if (savedAddresses.length > 0) {
      const primary = savedAddresses.find((a) => a.is_primary) || savedAddresses[0];
      setSelectedAddressId((prev) => {
        if (prev && savedAddresses.some((a) => a.id === prev)) return prev;
        return primary.id;
      });
    } else {
      setSelectedAddressId('');
    }
  }, [savedAddresses]);

  const activeAddress = savedAddresses.find((a) => a.id === selectedAddressId) || savedAddresses[0] || null;
  const hasValidAddress = Boolean(currentUser && activeAddress && activeAddress.address && activeAddress.address.trim().length >= 5);

  // Sync delivery date if all items are ready or if PO items exist
  React.useEffect(() => {
    if (hasPoItems) {
      setDeliveryType('po');
      if (poDate === todayDate) {
        setPoDate(tomorrowDate);
      }
    } else if (allItemsReady) {
      setDeliveryType('sameday');
      setPoDate(todayDate);
    }
  }, [hasPoItems, allItemsReady]);

  // Auto-sync customer info when currentUser / activeAddress changes
  React.useEffect(() => {
    if (activeAddress) {
      setCustomerName(activeAddress.recipient_name || currentUser?.name || '');
      setCustomerPhone(activeAddress.phone || currentUser?.phone || '');
    } else if (currentUser) {
      if (currentUser.name) setCustomerName(currentUser.name);
      if (currentUser.phone) setCustomerPhone(currentUser.phone);
      if (currentUser.note) setDeliveryNote(currentUser.note);
      if (currentUser.referred_by) setReferralCodeInput(currentUser.referred_by);
    }
  }, [currentUser, activeAddress]);

  // Subtotal calculation (supports variants)
  const subtotal = cart.reduce((sum, item) => {
    const price = item.selectedVariant ? item.selectedVariant.price : (item.product.discount_price || item.product.price);
    return sum + price * item.quantity;
  }, 0);

  // Hitung estimasi keuntungan pesanan & rumus 7% poin keuntungan belanja
  const estimatedProfit = cart.reduce((sum, item) => {
    const sellingPrice = item.selectedVariant ? item.selectedVariant.price : (item.product.discount_price || item.product.price);
    const costPrice = item.selectedVariant
      ? item.selectedVariant.cost_price
      : (item.product.cost_price > 0 ? item.product.cost_price : sellingPrice * 0.7);
    const profit = Math.max(0, sellingPrice - costPrice);
    return sum + profit * item.quantity;
  }, 0);

  // 7% total dari keuntungan menjadi poin belanja untuk pembeli
  const estimatedPoints = Math.floor(estimatedProfit * 0.07);

  // Cek apakah akun pengguna baru (usia pendaftaran <= 1 bulan / 30 hari)
  const isNewUserFreeShipping = Boolean(
    currentUser && (
      !currentUser.created_at ||
      (Date.now() - new Date(currentUser.created_at).getTime()) <= 30 * 24 * 60 * 60 * 1000
    )
  );

  // Free shipping if >= 35.000 or new user <= 1 month
  const freeDeliveryThreshold = 35000;
  const isFreeDelivery = subtotal === 0 || isNewUserFreeShipping || subtotal >= freeDeliveryThreshold;
  const deliveryFee = isFreeDelivery ? 0 : 500;
  const totalAmount = subtotal + deliveryFee;

  const formatRupiah = (val: number) => 'Rp' + val.toLocaleString('id-ID');

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentUser) {
      onRequireAuth?.();
      return;
    }

    if (!hasValidAddress || !activeAddress) {
      setErrorMessage('Mohon lengkapi alamat rumah & foto rumah di profil terlebih dahulu sebelum memesan.');
      onClose();
      if (onGoToProfileAddress) {
        onGoToProfileAddress();
      } else {
        window.location.hash = '#alamat';
      }
      return;
    }

    if (cart.length === 0) {
      setErrorMessage('Keranjang belanja masih kosong!');
      return;
    }

    if (subtotal < 10000) {
      setErrorMessage(`Minimal belanja sayur & sembako subuh adalah Rp 10.000. Tambahkan ${formatRupiah(10000 - subtotal)} lagi untuk melanjutkan.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const items: OrderItem[] = cart.map((item) => {
        const itemPrice = item.selectedVariant ? item.selectedVariant.price : (item.product.discount_price || item.product.price);
        const itemCost = item.selectedVariant ? item.selectedVariant.cost_price : item.product.cost_price;
        const unitLabel = item.selectedVariant ? item.selectedVariant.name : item.product.unit;
        return {
          product_id: item.product.id,
          product_name: item.product.name,
          product_image: item.product.image_url,
          variant_name: item.selectedVariant ? item.selectedVariant.name : undefined,
          unit: unitLabel,
          price: itemPrice,
          cost_price: itemCost,
          quantity: item.quantity,
          subtotal: itemPrice * item.quantity,
        };
      });

      const digits = (activeAddress.phone || customerPhone).replace(/\D/g, '');
      let cleanPhone = digits;
      if (digits.startsWith('62')) {
        cleanPhone = '0' + digits.slice(2);
      } else if (digits.startsWith('8')) {
        cleanPhone = '0' + digits;
      }

      const finalNote = activeAddress.landmark
        ? (deliveryNote.trim() ? `${activeAddress.landmark} | Catatan: ${deliveryNote.trim()}` : activeAddress.landmark)
        : deliveryNote.trim();

      const newOrder = await onSubmitOrder({
        customer_name: (activeAddress.recipient_name || customerName || currentUser.name).trim(),
        customer_phone: cleanPhone || customerPhone.trim(),
        delivery_address: activeAddress.address.trim(),
        delivery_note: finalNote,
        delivery_slot: selectedSlot,
        po_date: poDate,
        po_cutoff: "21:00 WIB",
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        discount: isFreeDelivery ? 500 : 0,
        total_amount: totalAmount,
        total_profit: estimatedProfit,
        points_earned: estimatedPoints,
        referral_code: referralCodeInput.trim() || currentUser?.referred_by || undefined,
        referral_points_earned: Math.floor(estimatedProfit * 0.05),
        payment_method: paymentMethod,
        house_photo_url: activeAddress.house_photo_url || currentUser?.house_photo_url,
        items: items,
      });

      // Confetti celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      onClearCart();
      onClose();
      onOrderSuccess(newOrder);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memproses pesanan. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-end sm:items-stretch sm:justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
      />

      {/* Slide-over panel / Mobile Bottom Sheet */}
      <motion.div
        initial={{ y: '100%', opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="relative z-10 w-full sm:max-w-lg bg-white h-[92vh] sm:h-full rounded-t-3xl sm:rounded-none shadow-2xl flex flex-col justify-between overflow-hidden"
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2 shrink-0" />

        {/* Header */}
        <div className="px-4 py-3 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base">Keranjang Belanja</h2>
              <p className="text-[11px] text-slate-500">{cart.length} jenis produk dipilih</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl">
              {errorMessage}
            </div>
          )}

          {/* Delivery Mode Banner */}
          {cart.length > 0 && (
            <div>
              {hasPoItems ? (
                <div className="bg-amber-50/90 border border-amber-200 p-3 rounded-2xl flex items-start gap-2.5">
                  <span className="text-base leading-none">🟡</span>
                  <div className="text-xs">
                    <span className="font-bold text-amber-900 block">Pesanan Memuat Barang Pre-Order (PO)</span>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      Barang PO akan disiapkan langsung dari pasokan baru dan dikirim bersamaan ke rumah Anda sesuai jadwal pengiriman esok hari.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50/90 border border-emerald-200 p-3 rounded-2xl flex items-start gap-2.5">
                  <span className="text-base leading-none">🟢</span>
                  <div className="text-xs">
                    <span className="font-bold text-emerald-900 block">Semua Barang Ready Stok!</span>
                    <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                      Semua produk tersedia di toko kami dan bisa langsung diantar hari ini juga (Sameday) ke rumah Anda.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cart Item List */}
          {cart.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="text-5xl">🛒</div>
              <p className="text-sm font-semibold text-slate-600">Keranjang Belanja Masih Kosong</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Yuk pilih sembako, sayur segar, lauk pauk, atau kebutuhan rumah tangga favorit Anda!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                <span>Daftar Barang Belanja</span>
                <button
                  onClick={onClearCart}
                  className="text-red-500 hover:text-red-600 text-[11px] underline"
                >
                  Kosongkan
                </button>
              </div>

              {cart.map((item) => {
                const { product, quantity, selectedVariant } = item;
                const itemPrice = selectedVariant ? selectedVariant.price : (product.discount_price || product.price);
                const isReady = product.stock > 0;
                const itemKey = selectedVariant ? `${product.id}_${selectedVariant.id}` : product.id;
                const itemCost = selectedVariant ? selectedVariant.cost_price : (product.cost_price > 0 ? product.cost_price : itemPrice * 0.7);
                const itemProfit = Math.max(0, itemPrice - itemCost);
                const itemPoints = Math.max(0, Math.floor(itemProfit * 0.07 * quantity));

                return (
                  <div
                    key={itemKey}
                    className="flex items-center gap-3 bg-slate-50/70 p-2.5 rounded-2xl border border-slate-100"
                  >
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-14 h-14 object-cover rounded-xl shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                          isReady
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isReady ? 'Ready' : 'PO'}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 truncate">{product.name}</h4>
                      </div>

                      {selectedVariant ? (
                        <div className="flex items-center gap-1 my-0.5">
                          <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1">
                            <Scale className="w-2.5 h-2.5 text-emerald-700" />
                            {selectedVariant.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 block font-normal">Satuan: /{product.unit}</span>
                      )}

                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[11px] text-emerald-700 font-black">
                          {formatRupiah(itemPrice)}
                        </p>
                        {itemPoints > 0 && (
                          <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                            <Coins className="w-2.5 h-2.5 fill-amber-400 text-amber-600" />
                            +{itemPoints} Poin
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, -1, selectedVariant?.id)}
                          className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-black w-4 text-center text-slate-800">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, 1, selectedVariant?.id)}
                          className="w-5 h-5 flex items-center justify-center text-emerald-700 hover:bg-emerald-50 rounded"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(product.id, selectedVariant?.id)}
                        className="text-slate-300 hover:text-red-500 p-1 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {cart.length > 0 && (
            <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4 pt-2">
              {/* Delivery Schedule Selection */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Jadwal Pengantaran ke Rumah:</span>
                  </label>
                  {hasPoItems ? (
                    <span className="text-[10px] bg-amber-600 text-white font-extrabold px-2 py-0.5 rounded-full">
                      Pre-Order (PO)
                    </span>
                  ) : (
                    <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full">
                      Bisa Hari Ini
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {!hasPoItems && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryType('sameday');
                        setPoDate(todayDate);
                      }}
                      className={`p-2 rounded-xl text-left border transition-all text-xs ${
                        poDate === todayDate
                          ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 bg-white/70 hover:bg-white'
                      }`}
                    >
                      <span className="font-black text-slate-800 block flex items-center gap-1">
                        <span>🚀</span> Diantar Hari Ini
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">{todayDate}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryType('po');
                      setPoDate(tomorrowDate);
                    }}
                    className={`p-2 rounded-xl text-left border transition-all text-xs ${
                      poDate === tomorrowDate
                        ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 bg-white/70 hover:bg-white'
                    }`}
                  >
                    <span className="font-black text-slate-800 block flex items-center gap-1">
                      <span>🌅</span> Besok Pagi
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">{tomorrowDate}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryType('po');
                      setPoDate(dayAfterTomorrow);
                    }}
                    className={`p-2 rounded-xl text-left border transition-all text-xs ${
                      poDate === dayAfterTomorrow
                        ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 bg-white/70 hover:bg-white'
                    }`}
                  >
                    <span className="font-black text-slate-800 block flex items-center gap-1">
                      <span>📅</span> Lusa Pagi
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">{dayAfterTomorrow}</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  {hasPoItems
                    ? '*Barang dipasok baru dan diantar langsung ke rumah Anda.'
                    : '*Pesanan siap dikirim langsung oleh kurir ke alamat Anda.'}
                </p>
              </div>

              {/* Delivery Slot Selection */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  Pilih Slot Waktu Pengiriman:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {deliverySlots.length === 0 ? (
                    <div className="p-2.5 rounded-xl border border-slate-200 bg-white text-xs">
                      <span className="font-bold text-slate-700">06:00 - 08:00 WIB</span>
                      <p className="text-[11px] text-slate-500">Pagi Hari</p>
                    </div>
                  ) : (
                    deliverySlots.map((slot) => (
                      <label
                        key={slot.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          selectedSlot === slot.time_range
                            ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500/20'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="delivery_slot"
                          checked={selectedSlot === slot.time_range}
                          onChange={() => setSelectedSlot(slot.time_range)}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="text-xs">
                          <span className="font-black text-slate-800">{slot.time_range}</span>
                          <p className="text-[11px] text-slate-500">{slot.label}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Customer Contact & Address (Buku Alamat & Kurir Subuh) */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Alamat Pengantaran Kurir Subuh</span>
                  </h3>
                  {hasValidAddress && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onGoToProfileAddress) onGoToProfileAddress();
                        else window.location.hash = '#alamat';
                      }}
                      className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span>Kelola di Profil</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>

                {!currentUser ? (
                  <div className="bg-white border-2 border-dashed border-amber-300 rounded-xl p-3 text-center space-y-2">
                    <UserIcon className="w-6 h-6 text-amber-600 mx-auto" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Masuk untuk Menggunakan Alamat</h4>
                      <p className="text-[10px] text-slate-500">
                        Masuk ke akun Anda untuk memilih alamat rumah dan foto kurir subuh.
                      </p>
                    </div>
                    {onRequireAuth && (
                      <button
                        type="button"
                        onClick={onRequireAuth}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs"
                      >
                        Masuk / Daftar
                      </button>
                    )}
                  </div>
                ) : !hasValidAddress ? (
                  <div className="bg-amber-50/80 border-2 border-dashed border-amber-400 rounded-2xl p-4 text-center space-y-2.5">
                    <MapPin className="w-6 h-6 text-amber-600 mx-auto" />
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black text-amber-950">Alamat Belum Diisi di Profil</h4>
                      <p className="text-[11px] text-amber-900/80 leading-relaxed">
                        Kurir subuh membutuhkan alamat lengkap, patokan jalan, dan foto rumah agar pesanan Anda diantar tepat tanpa keliru.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onGoToProfileAddress) onGoToProfileAddress();
                        else window.location.hash = '#alamat';
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>🏠 Lengkapi Alamat di Profil</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    {/* Selected Address Display Card */}
                    <div className="p-3 rounded-xl border border-emerald-300 bg-white space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <strong className="text-xs text-slate-900">{activeAddress.label}</strong>
                          {activeAddress.is_primary && (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black px-2 py-0.2 rounded-full flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                              <span>Utama</span>
                            </span>
                          )}
                        </div>

                        {savedAddresses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setIsChangingAddress(!isChangingAddress)}
                            className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isChangingAddress ? 'Tutup' : 'Ganti Alamat'}</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${isChangingAddress ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-700 space-y-1">
                        <p className="font-bold text-slate-800">
                          {activeAddress.recipient_name || currentUser.name} ({activeAddress.phone || currentUser.phone})
                        </p>
                        <p className="text-slate-700 leading-relaxed">{activeAddress.address}</p>
                        {activeAddress.landmark && (
                          <p className="text-amber-900 bg-amber-50 p-1.5 rounded-lg border border-amber-200/60 text-[10px] flex items-start gap-1">
                            <Navigation className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                            <span><strong>Patokan:</strong> {activeAddress.landmark}</span>
                          </p>
                        )}
                      </div>

                      {/* Foto Rumah Kurir Subuh */}
                      <div className="pt-1.5 border-t border-slate-100 flex items-center gap-2">
                        {activeAddress.house_photo_url ? (
                          <>
                            <img
                              src={activeAddress.house_photo_url}
                              alt="Foto Rumah"
                              className="w-12 h-9 object-cover rounded-lg border border-emerald-300 shrink-0"
                            />
                            <div className="text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Foto Rumah Terpasang</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between w-full text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                            <span>Belum ada foto rumah</span>
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                if (onGoToProfileAddress) onGoToProfileAddress();
                                else window.location.hash = '#alamat';
                              }}
                              className="font-bold text-emerald-700 underline"
                            >
                              + Unggah
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dropdown Ganti Alamat */}
                    <AnimatePresence>
                      {isChangingAddress && savedAddresses.length > 1 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-1.5 pt-1 overflow-hidden"
                        >
                          <span className="text-[10px] font-bold text-slate-500 block">
                            Pilih Alamat Lain:
                          </span>
                          {savedAddresses.map((addr) => (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => {
                                setSelectedAddressId(addr.id);
                                setIsChangingAddress(false);
                              }}
                              className={`w-full text-left p-2 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between ${
                                addr.id === activeAddress.id
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span className="truncate">{addr.label} — {addr.address}</span>
                              {addr.id === activeAddress.id && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Catatan untuk kurir */}
                    <div>
                      <input
                        type="text"
                        value={deliveryNote}
                        onChange={(e) => setDeliveryNote(e.target.value)}
                        placeholder="Catatan tambahan untuk Kurir (Cth: Taruh di teras depan / pagar)"
                        className="w-full text-xs p-2 bg-white rounded-lg border border-slate-200 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Kode Referral Pengundang (Ajak Tetangga) */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>🤝</span>
                    <span>Kode Referral Teman / Tetangga</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Opsional</span>
                </div>
                {currentUser?.referred_by ? (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-2.5 rounded-xl flex items-center justify-between">
                    <span className="text-xs">
                      Terhubung pengundang: <strong className="font-mono text-emerald-800">{currentUser.referred_by}</strong>
                    </span>
                    <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-black px-2 py-0.5 rounded-md">
                      Aktif ✓
                    </span>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={referralCodeInput}
                      onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase().trim())}
                      placeholder="Punya kode teman? Contoh: SITI-7890"
                      className="w-full text-xs p-2.5 bg-white rounded-xl border border-slate-200 focus:border-emerald-500 font-mono uppercase tracking-wider outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Teman yang mengundang Anda akan mendapatkan bonus koin 5% dari keuntungan pesanan ini.
                    </p>
                  </div>
                )}
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Metode Pembayaran:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Banknote className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                    <span className="text-[11px] block">COD (Tunai)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qris')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      paymentMethod === 'qris'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                    <span className="text-[11px] block">QRIS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      paymentMethod === 'bank_transfer'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                    <span className="text-[11px] block">Transfer</span>
                  </button>
                </div>

                {/* Dynamic Payment Method Guidance Box */}
                {paymentMethod === 'cod' && (
                  <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3 text-xs space-y-1 text-sky-950">
                    <div className="flex items-center gap-1.5 font-bold text-sky-900">
                      <Banknote className="w-4 h-4 text-sky-600" />
                      <span>Bayar Tunai di Tempat (COD)</span>
                    </div>
                    <p className="text-[11px] text-sky-800 leading-relaxed">
                      Anda cukup membayar uang tunai langsung ke Kurir Subuh saat pesanan tiba di depan rumah. Disarankan menyiapkan uang pas <strong>{formatRupiah(totalAmount)}</strong>.
                    </p>
                  </div>
                )}

                {paymentMethod === 'qris' && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-3 text-xs space-y-2 text-amber-950">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-amber-600" />
                        <span>QRIS All Payment (Instan & Bebas Biaya)</span>
                      </span>
                      <span className="text-[9px] bg-amber-200/80 text-amber-900 font-black px-2 py-0.5 rounded-full">
                        Status: Menunggu Bukti
                      </span>
                    </div>

                    <div className="flex items-center gap-3 bg-white/90 p-2 rounded-xl border border-amber-200/80 shadow-2xs">
                      <img
                        src="/qris_jogopawon.jpg"
                        alt="QRIS Barcode Thumbnail"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-2xs"
                      />
                      <div className="flex-1">
                        <span className="text-[11px] font-black text-slate-800 block">JOGOPAWON, SEMBAKO</span>
                        <span className="text-[10px] text-slate-500 font-mono block">NMID: ID1026616559690 • A01</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-amber-900/90 leading-relaxed">
                      Dukung scan dari <strong>BCA, BRI, Mandiri, GoPay, OVO, DANA, ShopeePay</strong>. Setelah checkout, barcode QRIS resolusi penuh & form unggah bukti transfer akan langsung ditampilkan!
                    </p>
                  </div>
                )}

                {paymentMethod === 'bank_transfer' && (
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 text-xs space-y-2 text-emerald-950">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <span>Transfer Antar Bank</span>
                      </span>
                      <span className="text-[9px] bg-emerald-200/70 text-emerald-900 font-black px-2 py-0.5 rounded-full">
                        Status Awal: Menunggu Bukti
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                      Transfer ke rekening resmi JogoPawon (BCA / BRI / Mandiri). Setelah checkout, nomor rekening & tombol kirim bukti transfer WhatsApp akan langsung disediakan.
                    </p>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer Summary & Checkout Button */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/80 space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal Belanja ({cart.length} item)</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Ongkos Kirim</span>
                <span>
                  {isFreeDelivery ? (
                    <span className="text-emerald-600 font-bold">
                      GRATIS ({isNewUserFreeShipping ? 'Akun Baru < 1 Bln' : 'Bebas Ongkir'})
                    </span>
                  ) : (
                    formatRupiah(deliveryFee)
                  )}
                </span>
              </div>
              <div className="flex justify-between text-slate-900 font-black text-sm pt-1 border-t border-slate-200">
                <span>Total Pembayaran</span>
                <span className="text-emerald-700 text-base">{formatRupiah(totalAmount)}</span>
              </div>

              {/* Reward Points Earned */}
              <div className="flex justify-between items-center bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/80 text-amber-900 font-bold">
                <span className="flex items-center gap-1.5 text-xs">
                  <Coins className="w-3.5 h-3.5 fill-amber-400 text-amber-600 animate-pulse" />
                  <span>Dapat Koin Pawon (7% Laba)</span>
                </span>
                <span className="text-amber-800 font-black text-xs">+{estimatedPoints} Koin</span>
              </div>
            </div>

            {!currentUser ? (
              <button
                type="button"
                onClick={onRequireAuth}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black py-3 rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Masuk untuk Memesan ({formatRupiah(totalAmount)})</span>
              </button>
            ) : !hasValidAddress ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onGoToProfileAddress) onGoToProfileAddress();
                  else window.location.hash = '#alamat';
                }}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-amber-950 font-black py-3 rounded-2xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                <AlertCircle className="w-4 h-4 text-amber-900" />
                <span>⚠️ Lengkapi Alamat di Profil Terlebih Dahulu</span>
              </button>
            ) : subtotal < 10000 ? (
              <div className="space-y-2">
                <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl p-3 text-xs flex items-center justify-between gap-2 shadow-2xs">
                  <span className="text-[11px] font-medium leading-tight">
                    Minimal belanja sayur subuh: <strong>Rp 10.000</strong>. Tambah <strong>{formatRupiah(10000 - subtotal)}</strong> lagi.
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-950 font-bold px-2 py-0.5 rounded-lg shrink-0">
                    Kurang {formatRupiah(10000 - subtotal)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>+ Tambah Sayur / Bumbu Lainnya</span>
                </button>
              </div>
            ) : (
              <button
                type="submit"
                form="checkout-form"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black py-3 rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memproses Pesanan Belanja...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Pesan Sekarang ({formatRupiah(totalAmount)})</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
