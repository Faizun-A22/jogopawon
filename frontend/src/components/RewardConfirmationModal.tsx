import React, { useState, useEffect } from 'react';
import { RewardItem, User, RewardRedemption } from '../types';
import { api } from '../services/api';
import {
  Gift,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Truck,
  Store,
  MapPin,
  Phone,
  User as UserIcon,
  MessageCircle,
  ChevronRight,
  ShieldCheck,
  Clock,
  Coins,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface RewardConfirmationModalProps {
  isOpen: boolean;
  reward: RewardItem | null;
  currentUser: User | null;
  onClose: () => void;
  onSuccess: (claimNumber: string, remainingPoints: number, reward: RewardItem) => void;
  onRequireAuth?: () => void;
}

export const RewardConfirmationModal: React.FC<RewardConfirmationModalProps> = ({
  isOpen,
  reward,
  currentUser,
  onClose,
  onSuccess,
  onRequireAuth,
}) => {
  const [deliveryOption, setDeliveryOption] = useState<'antar_subuh' | 'ambil_toko'>('antar_subuh');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdClaim, setCreatedClaim] = useState<RewardRedemption | null>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      setRecipientName(currentUser.name || '');
      setRecipientPhone(currentUser.phone || '');
      setDeliveryAddress(currentUser.address || '');
      setNotes('');
      setDeliveryOption('antar_subuh');
      setErrorMessage(null);
      setCreatedClaim(null);
    }
  }, [isOpen, currentUser, reward]);

  if (!isOpen || !reward) return null;

  const userPoints = currentUser?.points || 0;
  const pointsCost = reward.points_required;
  const remainingPoints = userPoints - pointsCost;
  const isPointsSufficient = userPoints >= pointsCost;

  const handleConfirmRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    if (!isPointsSufficient) {
      setErrorMessage(`Poin Anda tidak mencukupi. Butuh ${pointsCost - userPoints} poin lagi.`);
      return;
    }

    if (!recipientName.trim()) {
      setErrorMessage('Nama penerima wajib diisi.');
      return;
    }

    if (!recipientPhone.trim()) {
      setErrorMessage('Nomor WhatsApp wajib diisi.');
      return;
    }

    if (deliveryOption === 'antar_subuh' && !deliveryAddress.trim()) {
      setErrorMessage('Alamat pengantaran wajib diisi untuk opsi antar kurir subuh.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const deliveryNotes = [
        recipientPhone.trim() && currentUser?.phone && recipientPhone.trim() !== currentUser.phone
          ? `Penerima di lokasi: ${recipientName.trim()} (${recipientPhone.trim()})`
          : '',
        notes.trim(),
      ]
        .filter(Boolean)
        .join('. ');

      const res = await api.redeemReward({
        reward_id: reward.id,
        customer_name: recipientName.trim() || currentUser?.name || 'Pelanggan JogoPawon',
        customer_phone: currentUser?.phone || recipientPhone.trim(),
        delivery_option: deliveryOption,
        delivery_address: deliveryOption === 'antar_subuh' ? deliveryAddress.trim() : 'Ambil di Toko JogoPawon Mart',
        notes: deliveryNotes,
      });

      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.55 },
      });

      const claimData: RewardRedemption = res.redemption || {
        id: `rdm_${Date.now()}`,
        claim_number: `RDM-${Date.now().toString().slice(-6)}`,
        reward_id: reward.id,
        reward_name: reward.name,
        reward_image: reward.image_url || reward.imageUrl || '',
        reward_category: reward.category,
        reward_unit: reward.unit,
        points_spent: pointsCost,
        customer_name: recipientName.trim(),
        customer_phone: recipientPhone.trim(),
        delivery_option: deliveryOption,
        delivery_address: deliveryAddress.trim(),
        notes: notes.trim(),
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setCreatedClaim(claimData);
      onSuccess(claimData.claim_number, res.remaining_points, reward);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengajukan penukaran hadiah. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWhatsAppAdminUrl = (claim: RewardRedemption) => {
    const text = `Halo Admin JogoPawon Mart, saya ingin konfirmasi penukaran hadiah koin:
📌 No. Klaim: *${claim.claim_number}*
🎁 Hadiah: *${claim.reward_name}* (${claim.points_spent} Poin)
👤 Penerima: *${claim.customer_name}* (${claim.customer_phone})
🚚 Metode: *${claim.delivery_option === 'antar_subuh' ? 'Diantar Kurir Subuh' : 'Ambil di Toko'}*
${claim.delivery_address ? `📍 Alamat: ${claim.delivery_address}\n` : ''}${claim.notes ? `📝 Catatan: ${claim.notes}\n` : ''}
Mohon diproses untuk pengiriman. Terima kasih! 🙏`;

    return `https://wa.me/6281234567890?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-emerald-100"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-4 sm:p-5 flex items-center justify-between relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Gift className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight flex items-center gap-1.5">
                <span>Konfirmasi Penukaran Poin</span>
                <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
              </h3>
              <p className="text-[11px] text-emerald-100 font-medium">
                Pojok Hadiah Loyalitas JogoPawon Mart
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {createdClaim ? (
            /* SUCCESS STATE AFTER CONFIRMATION */
            <div className="space-y-4 text-center py-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-black font-mono border border-amber-300 mb-2">
                  No. Klaim: {createdClaim.claim_number}
                </span>
                <h4 className="text-lg font-black text-slate-900">
                  Klaim Hadiah Berhasil Diajukan!
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                  Permintaan penukaran hadiah <span className="font-bold text-slate-800">{createdClaim.reward_name}</span> telah diteruskan ke Admin JogoPawon secara real-time.
                </p>
              </div>

              {/* Status Stepper Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-slate-500 font-medium">
                  <span>Status Verifikasi:</span>
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                    <Clock className="w-3 h-3 animate-spin" /> Menunggu Konfirmasi Admin
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Poin Dipotong:</span>
                  <span className="font-bold text-rose-600">-{createdClaim.points_spent} Poin</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Sisa Saldo Poin:</span>
                  <span className="font-bold text-emerald-700">{remainingPoints} Poin</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Penerima:</span>
                  <span className="font-semibold text-slate-800">{createdClaim.customer_name} ({createdClaim.customer_phone})</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Metode Pengambilan:</span>
                  <span className="font-semibold text-slate-800">
                    {createdClaim.delivery_option === 'antar_subuh' ? '🚚 Diantar Kurir Subuh' : '🏪 Ambil di Toko JogoPawon'}
                  </span>
                </div>
                {createdClaim.delivery_address && (
                  <div className="text-slate-600 pt-1">
                    <span className="block text-[11px] text-slate-400">Alamat:</span>
                    <span className="font-medium text-slate-800">{createdClaim.delivery_address}</span>
                  </div>
                )}
              </div>

              {/* WhatsApp Action Button */}
              <a
                href={getWhatsAppAdminUrl(createdClaim)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all text-xs sm:text-sm"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Konfirmasi via WhatsApp ke Admin</span>
              </a>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all text-xs"
              >
                Tutup Jendela
              </button>
            </div>
          ) : (
            /* CONFIRMATION FORM */
            <form onSubmit={handleConfirmRedeem} className="space-y-4">
              {/* Reward Item Summary Card */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center gap-3.5">
                <img
                  src={reward.image_url || reward.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200'}
                  alt={reward.name}
                  className="w-16 h-16 rounded-xl object-cover border border-emerald-200 shrink-0 bg-white"
                />
                <div className="flex-1 min-w-0">
                  <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md mb-1">
                    {reward.category}
                  </span>
                  <h4 className="font-black text-slate-900 text-sm leading-snug truncate">
                    {reward.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {reward.description || (reward.unit ? `Satuan: ${reward.unit}` : 'Hadiah Asli JogoPawon')}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Coins className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    <span className="text-xs font-black text-amber-700">
                      {pointsCost} Poin Koin
                    </span>
                    <span className="text-[10px] text-slate-400">
                      • Stok: {reward.stock} unit
                    </span>
                  </div>
                </div>
              </div>

              {/* Point Deduction Calculator */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Saldo Poin Anda Saat Ini:</span>
                  <span className="font-bold text-slate-900">{userPoints} Poin</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Poin yang Ditukarkan:</span>
                  <span className="font-bold text-rose-600">-{pointsCost} Poin</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-bold">
                  <span className="text-slate-700">Sisa Poin Setelah Penukaran:</span>
                  <span className={`text-sm ${isPointsSufficient ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {remainingPoints} Poin
                  </span>
                </div>
              </div>

              {!isPointsSufficient && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>
                    Poin Anda kurang <strong>{pointsCost - userPoints} poin</strong> untuk menukarkan hadiah ini.
                  </span>
                </div>
              )}

              {/* Delivery Option Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Pilih Cara Pengambilan Hadiah:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeliveryOption('antar_subuh')}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                      deliveryOption === 'antar_subuh'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <Truck className={`w-4 h-4 ${deliveryOption === 'antar_subuh' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span>Diantar Kurir Subuh</span>
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight">
                      Diselipkan bareng pesanan sayur pagi Anda
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryOption('ambil_toko')}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                      deliveryOption === 'ambil_toko'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <Store className={`w-4 h-4 ${deliveryOption === 'ambil_toko' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span>Ambil di Toko / Gudang</span>
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight">
                      Ambil mandiri di basecamp JogoPawon
                    </span>
                  </button>
                </div>
              </div>

              {/* Recipient Details */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <UserIcon className="w-3 h-3 text-slate-400" /> Nama Penerima
                    </label>
                    <input
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Nama lengkap penerima"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> No. WhatsApp
                    </label>
                    <input
                      type="tel"
                      required
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {deliveryOption === 'antar_subuh' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" /> Alamat Lengkap Pengantaran
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Contoh: Jl. Panglima Sudirman No. 12, Kel. Kebonagung, Pasuruan (Pagar hitam)"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none resize-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Catatan Tambahan untuk Admin & Kurir (Opsional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Titip tetangga atau antar bareng PO tanggal 17 Okt"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Guarantees Note */}
              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <p>
                  <strong>Jaminan Poin Aman:</strong> Poin hanya akan dipotong setelah Anda menekan tombol konfirmasi. Jika klaim ditolak atau stok habis, koin akan <strong>dikembalikan otomatis 100%</strong> ke akun Anda.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="w-1/3 py-2.5 px-3 rounded-2xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !isPointsSufficient}
                  className={`w-2/3 py-2.5 px-4 rounded-2xl font-black text-xs text-white flex items-center justify-center gap-2 shadow-lg transition-all ${
                    isPointsSufficient && !isSubmitting
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/30'
                      : 'bg-slate-300 cursor-not-allowed text-slate-500 shadow-none'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Memproses Klaim...</span>
                    </>
                  ) : (
                    <>
                      <Gift className="w-4 h-4" />
                      <span>Ya, Konfirmasi & Tukar Poin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
