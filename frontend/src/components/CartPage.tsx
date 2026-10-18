import React, { useState, useEffect, useMemo } from 'react';
import { Product, Order, User, CartItem, DeliverySlot, ProductVariant, UserAddress } from '../types';
import {
  ArrowLeft,
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
  Coins,
  Sparkles,
  Truck,
  AlertCircle,
  Home,
  Star,
  ChevronDown,
  Check,
  ExternalLink,
  Camera,
  Navigation,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CartPageProps {
  cart: CartItem[];
  deliverySlots: DeliverySlot[];
  onUpdateQuantity: (productId: string, delta: number, variantId?: string) => void;
  onRemoveItem: (productId: string, variantId?: string) => void;
  onClearCart: () => void;
  onSubmitOrder: (orderData: Partial<Order>) => Promise<Order>;
  onOrderSuccess: (order: Order) => void;
  currentUser?: User | null;
  onRequireAuth?: () => void;
  onBack: () => void;
  onGoToCatalog: () => void;
  onGoToProfileAddress?: () => void;
}

export const CartPage: React.FC<CartPageProps> = ({
  cart,
  deliverySlots,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onSubmitOrder,
  onOrderSuccess,
  currentUser,
  onRequireAuth,
  onBack,
  onGoToCatalog,
  onGoToProfileAddress,
}) => {
  const todayDate = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const hasPoItems = cart.some((item) => item.product.stock <= 0);
  const allItemsReady = cart.length > 0 && cart.every((item) => item.product.stock > 0);

  const [deliveryType, setDeliveryType] = useState<'sameday' | 'po'>('po');
  const [poDate, setPoDate] = useState<string>(tomorrowDate);
  const [selectedSlot, setSelectedSlot] = useState<string>('05:00 - 07:00 WIB');
  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '');
  const [deliveryNote, setDeliveryNote] = useState(currentUser?.note || '');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'qris'>('cod');
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

  // Sinkronisasi tipe pengiriman berdasarkan stok
  useEffect(() => {
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

  // Sinkronisasi data user saat login atau address berganti
  useEffect(() => {
    if (activeAddress) {
      setCustomerName(activeAddress.recipient_name || currentUser?.name || '');
      setCustomerPhone(activeAddress.phone || currentUser?.phone || '');
    } else if (currentUser) {
      if (currentUser.name) setCustomerName(currentUser.name);
      if (currentUser.phone) setCustomerPhone(currentUser.phone);
      if (currentUser.note) setDeliveryNote(currentUser.note);
    }
  }, [currentUser, activeAddress]);

  // Subtotal calculation
  const subtotal = cart.reduce((sum, item) => {
    const price = item.selectedVariant
      ? item.selectedVariant.price
      : item.product.discount_price || item.product.price;
    return sum + price * item.quantity;
  }, 0);

  // Estimasi keuntungan & reward point (1% keuntungan)
  const estimatedProfit = cart.reduce((sum, item) => {
    const sellingPrice = item.selectedVariant
      ? item.selectedVariant.price
      : item.product.discount_price || item.product.price;
    const costPrice = item.selectedVariant
      ? item.selectedVariant.cost_price || item.selectedVariant.price * 0.8
      : item.product.cost_price || item.product.price * 0.8;
    return sum + Math.max(0, sellingPrice - costPrice) * item.quantity;
  }, 0);

  // 7% total dari keuntungan menjadi koin belanja untuk pembeli
  const potentialPoints = Math.max(1, Math.floor(estimatedProfit * 0.07));

  // Cek apakah akun pengguna baru (usia pendaftaran <= 2 minggu / 14 hari)
  const isNewUserFreeShipping = Boolean(
    currentUser && (
      !currentUser.created_at ||
      (Date.now() - new Date(currentUser.created_at).getTime()) <= 14 * 24 * 60 * 60 * 1000
    )
  );

  // Standar ongkir Rp 500, GRATIS jika akun baru <= 2 minggu atau belanja >= Rp 35.000
  const isFreeDelivery = subtotal === 0 || isNewUserFreeShipping || subtotal >= 35000;
  const deliveryFee = isFreeDelivery ? 0 : 500;
  const totalAmount = subtotal + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (cart.length === 0) {
      setErrorMessage('Keranjang belanja Anda masih kosong.');
      return;
    }

    if (!currentUser) {
      if (onRequireAuth) {
        onRequireAuth();
      } else {
        setErrorMessage('Silakan masuk / daftar akun terlebih dahulu untuk melanjutkan pesanan.');
      }
      return;
    }

    if (!hasValidAddress || !activeAddress) {
      setErrorMessage('Mohon lengkapi alamat rumah & foto rumah di profil terlebih dahulu sebelum memesan.');
      if (onGoToProfileAddress) {
        onGoToProfileAddress();
      } else {
        window.location.hash = '#alamat';
      }
      return;
    }

    if (subtotal < 5000) {
      setErrorMessage(`Minimal belanja sayur & sembako subuh adalah Rp5.000. Tambahkan Rp${(5000 - subtotal).toLocaleString('id-ID')} lagi untuk checkout.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const orderItems = cart.map((item) => {
        const itemPrice = item.selectedVariant
          ? item.selectedVariant.price
          : item.product.discount_price || item.product.price;
        const itemCost = item.selectedVariant
          ? item.selectedVariant.cost_price || item.selectedVariant.price * 0.8
          : item.product.cost_price || item.product.price * 0.8;
        return {
          product_id: item.product.id,
          product_name: item.product.name,
          product_image: item.product.image_url,
          variant_name: item.selectedVariant ? item.selectedVariant.name : undefined,
          unit: item.selectedVariant ? item.selectedVariant.name : item.product.unit,
          cost_price: itemCost,
          quantity: item.quantity,
          price: itemPrice,
          subtotal: itemPrice * item.quantity,
        };
      });

      const finalNote = activeAddress.landmark
        ? (deliveryNote.trim() ? `${activeAddress.landmark} | Catatan: ${deliveryNote.trim()}` : activeAddress.landmark)
        : deliveryNote.trim();

      const orderData: Partial<Order> = {
        customer_name: (activeAddress.recipient_name || customerName || currentUser.name).trim(),
        customer_phone: (activeAddress.phone || customerPhone || currentUser.phone).trim(),
        delivery_address: activeAddress.address.trim(),
        delivery_note: finalNote,
        delivery_date: poDate,
        delivery_slot: selectedSlot,
        delivery_fee: deliveryFee,
        discount: 0,
        items: orderItems as any,
        subtotal: subtotal,
        total_amount: totalAmount,
        total_profit: estimatedProfit,
        points_earned: potentialPoints,
        referral_code: currentUser.referred_by || undefined,
        referral_points_earned: Math.floor(estimatedProfit * 0.05),
        payment_method: paymentMethod,
        house_photo_url: activeAddress.house_photo_url || currentUser.house_photo_url,
      };

      const result = await onSubmitOrder(orderData);
      onOrderSuccess(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal membuat pesanan. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-36 md:pb-16">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-2 rounded-2xl hover:bg-slate-100 text-slate-700 transition-colors"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5 leading-tight">
                <span>Keranjang Belanja</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  {cart.reduce((s, i) => s + i.quantity, 0)} item
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                JogoPawon Pasuruan • Pengiriman Sayur & Sembako
              </p>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={onClearCart}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 px-2.5 py-1 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 space-y-4 sm:space-y-6">
        {/* Error Alert */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-rose-600 text-white p-3.5 rounded-2xl shadow-md flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-200 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage('')}
                className="text-rose-200 hover:text-white px-2 py-1 rounded-lg text-xs"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty Cart State */}
        {cart.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-slate-200/90 shadow-2xs space-y-4 my-6">
            <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-4xl mx-auto shadow-inner">
              🛒
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Keranjang Belanja Anda Masih Kosong
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Yuk isi dengan aneka sayur segar petik subuh, sembako murah, lauk, dan bumbu dapur langsung ke pawon Anda!
              </p>
            </div>
            <button
              type="button"
              onClick={onGoToCatalog}
              className="bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-2xl shadow-md transition-all inline-flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Buka Katalog Belanja Sayur</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* 1. Item List Card */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-700" />
                  Daftar Pesanan Belanja
                </h3>
                <span className="text-[11px] text-slate-400 font-semibold">
                  {cart.length} macam barang
                </span>
              </div>

              <div className="divide-y divide-slate-100 space-y-2">
                {cart.map((item) => {
                  const itemPrice = item.selectedVariant
                    ? item.selectedVariant.price
                    : item.product.discount_price || item.product.price;
                  const itemKey = `${item.product.id}_${item.selectedVariant?.id || 'base'}`;

                  return (
                    <div
                      key={itemKey}
                      className="pt-2 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <img
                          src={item.product.image_url || '/placeholder.png'}
                          alt={item.product.name}
                          className="w-12 h-12 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-100"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 truncate">{item.product.name}</p>
                          {item.selectedVariant && (
                            <span className="inline-block text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.2 rounded-md">
                              {item.selectedVariant.name}
                            </span>
                          )}
                          <p className="text-[11px] text-emerald-700 font-black mt-0.5">
                            Rp{itemPrice.toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>

                      {/* Quantity Controller */}
                      <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 p-1 rounded-xl border border-slate-200/70">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.product.id, -1, item.selectedVariant?.id)
                          }
                          className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center font-black shadow-2xs transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-black text-slate-800 text-xs">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.product.id, 1, item.selectedVariant?.id)
                          }
                          className="w-6 h-6 rounded-lg bg-white text-emerald-800 hover:bg-slate-200 flex items-center justify-center font-black shadow-2xs transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reward Coin Teaser */}
              <div className="mt-3 bg-gradient-to-r from-amber-50 to-yellow-50 p-3 rounded-2xl border border-amber-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🪙</span>
                  <div>
                    <strong className="text-amber-950 block text-[11px] sm:text-xs">
                      Bonus Koin Pawon
                    </strong>
                    <span className="text-amber-800 text-[10px]">
                      Pesanan ini memberi Anda <strong>+{potentialPoints} Koin</strong> untuk ditukar sembako gratis!
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Delivery Options Card */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-700" />
                  Jadwal & Pengiriman Pasuruan
                </h3>
                <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {isNewUserFreeShipping
                    ? '🎉 Gratis Ongkir (Akun Baru < 2 Mgg)'
                    : deliveryFee === 0
                    ? '🎉 Bebas Ongkir'
                    : 'Ongkir Hemat Rp500'}
                </span>
              </div>

              {/* Promo Banner Gratis Ongkir 2 Minggu */}
              {isNewUserFreeShipping ? (
                <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-2.5 text-xs text-emerald-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    🎉 <strong>Promo Pengguna Baru:</strong> Akun Anda berhak menikmati <strong>Gratis Ongkir</strong> selama 2 minggu pertama sejak pendaftaran!
                  </span>
                </div>
              ) : !currentUser ? (
                <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-2.5 text-xs text-amber-900 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Daftar akun sekarang untuk klaim <strong>Gratis Ongkir 2 minggu penuh</strong>!
                    </span>
                  </div>
                  {onRequireAuth && (
                    <button
                      type="button"
                      onClick={onRequireAuth}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-black px-2.5 py-1 rounded-xl text-[10px] shrink-0 cursor-pointer shadow-xs"
                    >
                      Daftar / Masuk
                    </button>
                  )}
                </div>
              ) : null}

              {/* Delivery Type Switcher */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  disabled={hasPoItems}
                  onClick={() => {
                    setDeliveryType('sameday');
                    setPoDate(todayDate);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all relative ${
                    deliveryType === 'sameday'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                      : hasPoItems
                      ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <strong className="block text-xs font-bold">⚡ Siap Kirim Hari Ini</strong>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {hasPoItems ? 'Ada item PO di keranjang' : 'Stok ready langsung dikirim'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDeliveryType('po');
                    if (poDate === todayDate) setPoDate(tomorrowDate);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all relative ${
                    deliveryType === 'po'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <strong className="block text-xs font-bold">🌅 Pre-Order Petik Subuh</strong>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Kualitas paling segar besok subuh
                  </span>
                </button>
              </div>

              {/* Slot Jam Antar */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Pilih Jam Antar Kurir:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {['05:00 - 07:00 WIB', '07:00 - 09:00 WIB', '14:00 - 16:00 WIB'].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                        selectedSlot === slot
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Customer Info & Address Card (Buku Alamat & Kurir Subuh) */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-700" />
                  Alamat Pengantaran Kurir Subuh Pasuruan
                </h3>
                {hasValidAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onGoToProfileAddress) onGoToProfileAddress();
                      else window.location.hash = '#alamat';
                    }}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Kelola di Profil</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              {!currentUser ? (
                /* Jika belum login */
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-dashed border-amber-300 rounded-2xl p-4 text-center space-y-2.5">
                  <UserIcon className="w-7 h-7 text-amber-600 mx-auto" />
                  <div>
                    <h4 className="text-xs font-black text-slate-800">Masuk untuk Menggunakan Alamat Tersimpan</h4>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Masuk ke akun Anda untuk memilih alamat rumah dan foto panduan kurir subuh.
                    </p>
                  </div>
                  {onRequireAuth && (
                    <button
                      type="button"
                      onClick={onRequireAuth}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      Masuk / Daftar Akun
                    </button>
                  )}
                </div>
              ) : !hasValidAddress ? (
                /* Jika login tapi alamat kosong / belum diisi */
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-dashed border-amber-400 rounded-3xl p-5 text-center space-y-3 shadow-xs">
                  <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                    <MapPin className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-amber-950">Alamat Pengantaran Belum Diisi di Profil</h4>
                    <p className="text-xs text-amber-900/85 max-w-md mx-auto leading-relaxed">
                      Kurir subuh JogoPawon memerlukan <strong>alamat lengkap, patokan rumah, dan foto rumah/pagar</strong> agar pesanan sayur Anda diantar tepat di depan pintu tanpa keliru di pagi buta.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onGoToProfileAddress) onGoToProfileAddress();
                      else window.location.hash = '#alamat';
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-2.5 rounded-2xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2 active:scale-95"
                  >
                    <Home className="w-4 h-4" />
                    <span>🏠 Tulis Alamat & Foto Rumah di Profil</span>
                  </button>
                </div>
              ) : (
                /* Jika ada alamat tersimpan yang valid */
                <div className="space-y-3 text-xs">
                  {/* Selected Address Display Card */}
                  <div className="p-3.5 sm:p-4 rounded-2xl border border-emerald-300 bg-emerald-50/20 space-y-2 relative">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs sm:text-sm text-slate-900">
                          {activeAddress.label || 'Alamat Pengantaran'}
                        </span>
                        {activeAddress.is_primary && (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                            <span>Utama</span>
                          </span>
                        )}
                      </div>

                      {savedAddresses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setIsChangingAddress(!isChangingAddress)}
                          className="text-[11px] font-bold text-emerald-700 bg-white border border-emerald-300 px-2.5 py-1 rounded-xl hover:bg-emerald-50 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <span>{isChangingAddress ? 'Tutup Pilihan' : 'Ganti Alamat'}</span>
                          <ChevronDown className={`w-3 h-3 transition-transform ${isChangingAddress ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>

                    {/* Penerima & Kontak */}
                    <div className="text-slate-700 space-y-1">
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{activeAddress.recipient_name || currentUser.name}</span>
                        <span className="text-slate-300 font-normal">•</span>
                        <Phone className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                        <span className="text-slate-500 font-normal">{activeAddress.phone || currentUser.phone}</span>
                      </p>
                      <p className="flex items-start gap-1.5 leading-relaxed text-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{activeAddress.address}</span>
                      </p>
                      {activeAddress.landmark && (
                        <p className="flex items-start gap-1.5 text-amber-950 bg-amber-50/80 p-2 rounded-xl border border-amber-200/70 text-[11px]">
                          <Navigation className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span><strong>Patokan Rumah:</strong> {activeAddress.landmark}</span>
                        </p>
                      )}
                    </div>

                    {/* Foto Rumah Thumbnail Kurir Subuh */}
                    <div className="pt-2 border-t border-emerald-100 flex items-center gap-3">
                      {activeAddress.house_photo_url ? (
                        <>
                          <img
                            src={activeAddress.house_photo_url}
                            alt="Foto Rumah"
                            className="w-16 h-12 object-cover rounded-xl border border-emerald-300 shadow-2xs shrink-0"
                          />
                          <div className="flex-1 text-[11px]">
                            <span className="font-bold text-emerald-900 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              Foto Rumah Siap (Panduan Kurir Subuh)
                            </span>
                            <span className="text-slate-500 text-[10px] block">
                              Kurir mengenali pagar & teras Anda saat subuh.
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-between gap-2 w-full bg-amber-50/80 p-2 rounded-xl border border-amber-200">
                          <div className="flex items-center gap-2">
                            <Camera className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="text-[11px] text-amber-900 font-medium">
                              Belum ada foto rumah untuk alamat ini.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (onGoToProfileAddress) onGoToProfileAddress();
                              else window.location.hash = '#alamat';
                            }}
                            className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-emerald-200 hover:underline shrink-0"
                          >
                            + Unggah Foto
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dropdown / Accordion Ganti Alamat Lainnya */}
                  <AnimatePresence>
                    {isChangingAddress && savedAddresses.length > 1 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 pt-1 overflow-hidden"
                      >
                        <span className="text-[11px] font-black text-slate-700 block">
                          Pilih dari Alamat Tersimpan:
                        </span>
                        <div className="space-y-2">
                          {savedAddresses.map((addr) => (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => {
                                setSelectedAddressId(addr.id);
                                setIsChangingAddress(false);
                              }}
                              className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                                addr.id === activeAddress.id
                                  ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-500'
                                  : 'border-slate-200 bg-white hover:bg-slate-50'
                              }`}
                            >
                              <div className="space-y-0.5 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <strong className="text-xs text-slate-800">{addr.label}</strong>
                                  {addr.is_primary && (
                                    <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full">
                                      Utama
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 line-clamp-1">{addr.address}</p>
                              </div>
                              {addr.id === activeAddress.id && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              )}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Catatan Tambahan Pesanan (Opsional) */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Catatan Tambahan untuk Kurir / Pesanan <span className="text-slate-400 font-normal">(Opsional)</span>:
                    </label>
                    <input
                      type="text"
                      value={deliveryNote}
                      onChange={(e) => setDeliveryNote(e.target.value)}
                      placeholder="Contoh: Titip ke tetangga / gantung di cantolan pagar depan"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 4. Payment Method Card */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  Metode Pembayaran
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    paymentMethod === 'cod'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-lg block mb-1">💵</span>
                  <strong className="block text-xs">COD (Bayar di Tempat)</strong>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Bayar tunai ke kurir saat barang tiba
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('qris')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    paymentMethod === 'qris'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-lg block mb-1">📱</span>
                  <strong className="block text-xs">QRIS Pasuruan</strong>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Scan via BCA, Mandiri, BRI, GoPay, DANA
                  </span>
                </button>
              </div>
            </div>

            {/* 5. Summary & Price Breakdown Card */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-2 text-xs">
              <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                Ringkasan Pembayaran
              </h3>
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} produk)</span>
                <span className="font-bold">Rp{subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Ongkos Kirim Pasuruan</span>
                <span className="font-bold">
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <span className="line-through text-slate-400 font-normal">Rp500</span>
                      <span>GRATIS ({isNewUserFreeShipping ? 'Akun Baru < 2 Mgg' : 'Bebas Ongkir'})</span>
                    </span>
                  ) : (
                    `Rp${deliveryFee.toLocaleString('id-ID')}`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-slate-900 font-black text-sm pt-2 border-t border-slate-100">
                <span>Total Tagihan:</span>
                <span className="text-emerald-800 text-base">
                  Rp{totalAmount.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/80 text-amber-900 font-bold mt-1">
                <span className="flex items-center gap-1.5 text-xs">
                  <Coins className="w-3.5 h-3.5 fill-amber-400 text-amber-600 animate-pulse" />
                  <span>Bonus Koin Belanja</span>
                </span>
                <span className="text-amber-800 font-black text-xs">+{potentialPoints} Koin</span>
              </div>
            </div>

            {/* Submit Button (Gated if address is missing) */}
            {!currentUser ? (
              <button
                type="button"
                onClick={onRequireAuth}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-700/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserIcon className="w-5 h-5 text-emerald-200" />
                <span>Masuk / Daftar Akun untuk Melanjutkan Pesanan</span>
              </button>
            ) : !hasValidAddress ? (
              <button
                type="button"
                onClick={() => {
                  if (onGoToProfileAddress) onGoToProfileAddress();
                  else window.location.hash = '#alamat';
                }}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-amber-950 font-black text-sm rounded-2xl shadow-lg shadow-amber-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <AlertCircle className="w-5 h-5 text-amber-900" />
                <span>⚠️ Lengkapi Alamat & Foto Rumah di Profil Terlebih Dahulu</span>
              </button>
            ) : subtotal < 5000 ? (
              <div className="space-y-2">
                <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl p-3.5 text-xs flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-medium leading-tight">
                      Minimal belanja sayur subuh: <strong>Rp5.000</strong>. Tambah <strong>Rp{(5000 - subtotal).toLocaleString('id-ID')}</strong> lagi agar hemat ongkir & bisa dikirim.
                    </span>
                  </div>
                  <span className="text-[10px] bg-amber-200 text-amber-950 font-bold px-2 py-0.5 rounded-lg shrink-0">
                    Kurang Rp{(5000 - subtotal).toLocaleString('id-ID')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>+ Tambah Sayur / Bumbu Lainnya</span>
                </button>
              </div>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 hover:from-emerald-700 hover:to-teal-900 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-700/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memproses Pesanan Anda...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                    <span>Konfirmasi & Buat Pesanan (Rp{totalAmount.toLocaleString('id-ID')})</span>
                  </>
                )}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
