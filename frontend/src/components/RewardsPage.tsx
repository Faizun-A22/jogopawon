import React, { useState, useEffect } from 'react';
import { RewardItem, User } from '../types';
import { api } from '../services/api';
import {
  Coins,
  Gift,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  ShoppingBag,
  Flame,
  Layers,
  Award,
  Zap,
  Star,
  Info,
  Copy,
  Check,
  Share2,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { RewardConfirmationModal } from './RewardConfirmationModal';

interface RewardsPageProps {
  currentUser: User | null;
  onBack: () => void;
  onGoToCatalog: () => void;
  onRequireAuth: (action?: () => void, message?: string) => void;
  onPointsUpdated: (newPoints: number) => void;
}

export const RewardsPage: React.FC<RewardsPageProps> = ({
  currentUser,
  onBack,
  onGoToCatalog,
  onRequireAuth,
  onPointsUpdated,
}) => {
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [rewardToConfirm, setRewardToConfirm] = useState<RewardItem | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Referral states
  const [referralInfo, setReferralInfo] = useState<any>(null);
  const [isCopiedRef, setIsCopiedRef] = useState(false);

  const userPoints = currentUser?.points || 0;

  useEffect(() => {
    loadRewards();
    if (currentUser?.phone) {
      api.getReferralInfo(currentUser.phone)
        .then((data) => setReferralInfo(data))
        .catch(() => {});
    }
  }, [currentUser?.phone]);

  const effectiveReferralCode = referralInfo?.referral_code || currentUser?.referral_code || 'PAWON77';

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(effectiveReferralCode);
    setIsCopiedRef(true);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
    });
    setTimeout(() => setIsCopiedRef(false), 2500);
  };

  const handleShareWA = () => {
    const text = `Halo bu! Belanja sayur subuh petik petani di JogoPawon Mart praktis diantar ke rumah. Pakai kode referal saya: *${effectiveReferralCode}* buat dapat bonus koin hadiah & gratis ongkir!\n\nBuka di: https://jogopawon.com/?ref=${effectiveReferralCode}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const loadRewards = async () => {
    setLoading(true);
    try {
      const data = await api.getRewards();
      setRewards(data);
    } catch (e) {
      console.warn('Gagal memuat katalog hadiah:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = (reward: RewardItem) => {
    if (!currentUser) {
      onRequireAuth(
        () => handleRedeem(reward),
        'Silakan masuk terlebih dahulu untuk menukarkan poin hadiah Anda.'
      );
      return;
    }

    if (userPoints < reward.points_required) {
      setErrorMessage(
        `Poin Anda belum cukup. Butuh ${reward.points_required - userPoints} poin lagi untuk menukar ${reward.name}.`
      );
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    // Buka popup dialog konfirmasi penukaran
    setRewardToConfirm(reward);
  };

  const categories = [
    { id: 'all', label: '🎁 Semua Hadiah' },
    { id: 'Sembako', label: '🌾 Sembako & Dapur' },
    { id: 'Alat Rumah Tangga', label: '🍳 Alat Dapur' },
    { id: 'Elektronik', label: '⚡ Hadiah Mewah & Elektronik' },
    { id: 'Voucher', label: '🎟️ Voucher Belanja' },
  ];

  const filteredRewards =
    selectedCategory === 'all'
      ? rewards
      : rewards.filter((r) => {
          const cat = (r.category || '').toLowerCase();
          const target = selectedCategory.toLowerCase();
          if (target === 'sembako') {
            return cat.includes('sembako') || cat.includes('sayur') || cat.includes('bumbu');
          }
          if (target.includes('alat') || target.includes('rumah')) {
            return cat.includes('alat') || cat.includes('rumah') || cat.includes('perabot');
          }
          if (target.includes('elektronik')) {
            return cat.includes('elektronik') || cat.includes('listrik') || cat.includes('mewah');
          }
          return cat === target;
        });

  return (
    <div className="min-h-screen bg-slate-50 pb-28 md:pb-12">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
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
                <span>Pojok Koin Pawon</span>
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Tukar Koin Belanja dengan Hadiah Gratis Tanpa Diundi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGoToCatalog}
            className="hidden sm:flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Katalog Belanja</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-4 sm:space-y-6">
        {/* Alerts */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-md flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-200 hover:text-white px-2 py-1 rounded-lg text-xs"
              >
                Tutup
              </button>
            </motion.div>
          )}

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
                onClick={() => setErrorMessage(null)}
                className="text-rose-200 hover:text-white px-2 py-1 rounded-lg text-xs"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero User Coin Card */}
        <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-emerald-700/50 relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-56 h-56 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 right-1/4 w-32 h-32 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-amber-400 text-amber-950 text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                  PROGRAM LOYALITAS KELUARGA
                </span>
                <span className="text-xs text-emerald-200 font-bold">100% Bebas Undian</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Tabungan Koin Pawon Anda
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 max-w-md font-medium leading-relaxed">
                Setiap rupiah yang Anda belanjakan untuk sayur, sembako, dan bumbu dapur menghasilkan koin yang bisa Anda tukar dengan hadiah kebutuhan rumah tangga.
              </p>
            </div>

            {/* Saldo Pill */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-inner flex items-center justify-between sm:justify-start gap-4 shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-300 via-yellow-400 to-amber-500 text-amber-950 flex items-center justify-center text-3xl shadow-md ring-2 ring-white/60 shrink-0">
                🪙
              </div>
              <div>
                <span className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider block">
                  Saldo Koin Aktif
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-black text-amber-300 tracking-tight leading-none">
                    {userPoints.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-white/90 font-bold">Koin</span>
                </div>
                {!currentUser && (
                  <button
                    type="button"
                    onClick={() => onRequireAuth(undefined, 'Masuk untuk melihat koin Anda')}
                    className="mt-1 text-[11px] text-amber-300 hover:text-amber-200 underline font-bold"
                  >
                    Masuk ke Akun Anda ➔
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3 Steps Mini Horizontal Cards */}
          <div className="mt-6 pt-5 border-t border-emerald-700/60 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="bg-emerald-950/60 p-3 rounded-2xl border border-emerald-700/40 flex items-center gap-3">
              <span className="text-2xl shrink-0">🛒</span>
              <div>
                <strong className="text-white block text-[11px] sm:text-xs">1. Belanja Harian</strong>
                <span className="text-emerald-200 text-[10px]">Pesan sayur & lauk segar</span>
              </div>
            </div>
            <div className="bg-emerald-950/60 p-3 rounded-2xl border border-emerald-700/40 flex items-center gap-3">
              <span className="text-2xl shrink-0">🪙</span>
              <div>
                <strong className="text-amber-300 block text-[11px] sm:text-xs">2. Koin Bertambah</strong>
                <span className="text-emerald-200 text-[10px]">Otomatis masuk ke akun Anda</span>
              </div>
            </div>
            <div className="bg-emerald-950/60 p-3 rounded-2xl border border-emerald-700/40 flex items-center gap-3">
              <span className="text-2xl shrink-0">🎁</span>
              <div>
                <strong className="text-amber-200 block text-[11px] sm:text-xs">3. Hadiah Tanpa Diundi</strong>
                <span className="text-emerald-200 text-[10px]">Pilih & langsung bawa pulang!</span>
              </div>
            </div>
          </div>
        </div>

        {/* KARTU KODE REFERRAL EKSKLUSIF CUSTOMER */}
        <div className="bg-gradient-to-r from-amber-50 via-orange-50/60 to-amber-100/60 rounded-3xl p-5 sm:p-6 border-2 border-amber-300 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-amber-200/50 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-white font-black text-[10px] tracking-wider uppercase shadow-xs">
                  <Users className="w-3.5 h-3.5" />
                  <span>Program Ajak Tetangga & Teman</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Kode Referral Unik Anda
                </h3>
                <p className="text-xs text-slate-600 max-w-lg leading-relaxed">
                  Bagikan kode 7 karakter Anda ke teman atau tetangga. Saat mereka daftar dan belanja, Anda otomatis memperoleh <strong className="text-amber-800 font-black">Bonus Koin Ekstra</strong> dari setiap pesanan belanja mereka seumur hidup!
                </p>
              </div>

              {/* Referral Earnings Summary Badge */}
              {currentUser && (
                <div className="bg-white p-3 rounded-2xl border border-amber-200 shadow-xs flex items-center gap-3 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">
                    🎁
                  </div>
                  <div className="text-right sm:text-left">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Teman Diajak</span>
                    <span className="text-sm font-black text-slate-900">
                      {referralInfo?.invited_count || currentUser.referral_count || 0} Orang
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold block">
                      +{referralInfo?.total_earnings || currentUser.referral_earnings || 0} Koin
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Kode & Copy Box */}
            <div className="bg-white rounded-2xl p-3 sm:p-4 border border-amber-300 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-500 shrink-0">KODE REFERRAL:</span>
                <div className="bg-amber-50 border-2 border-amber-400 px-4 py-2 rounded-xl flex items-center gap-2">
                  <span className="font-mono text-xl sm:text-2xl font-black text-amber-950 tracking-widest select-all">
                    {effectiveReferralCode}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {/* Copy Button with Clipboard feedback */}
                <button
                  type="button"
                  onClick={handleCopyReferral}
                  className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer ${
                    isCopiedRef
                      ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-400'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {isCopiedRef ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-200" />
                      <span>Berhasil Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-300" />
                      <span>Salin Kode</span>
                    </>
                  )}
                </button>

                {/* Share WhatsApp Button */}
                <button
                  type="button"
                  onClick={handleShareWA}
                  className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Bagikan ke WA</span>
                </button>
              </div>
            </div>

            {!currentUser && (
              <p className="text-[11px] text-amber-800 font-semibold bg-amber-200/50 p-2.5 rounded-xl border border-amber-300 text-center">
                💡 <button type="button" onClick={() => onRequireAuth()} className="underline font-black hover:text-amber-950 cursor-pointer">Masuk atau Daftar Akun</button> untuk mendapatkan kode referral unik 7-karakter resmi atas nama Anda.
              </p>
            )}
          </div>
        </div>

        {/* Category Filters */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <Gift className="w-4 h-4 text-emerald-700" />
              Katalog Hadiah yang Siap Ditukar
            </h3>
            <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {filteredRewards.length} Pilihan Hadiah
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedCategory === c.id
                    ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reward Grid */}
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-100">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-600">Memuat katalog hadiah berkah...</p>
          </div>
        ) : filteredRewards.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center text-slate-500 border border-slate-200/80 space-y-3">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center text-2xl mx-auto shadow-inner">
              🎁
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800">
                Katalog Hadiah Sedang Disiapkan
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Kumpulkan Koin Pawon sebanyak-banyaknya dari setiap pesanan sayur dan sembako. Hadiah baru akan segera diumumkan oleh admin JogoPawon!
              </p>
            </div>
            <button
              type="button"
              onClick={onGoToCatalog}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Belanja Sekarang & Kumpulkan Koin</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredRewards.map((reward) => {
              const canAfford = userPoints >= reward.points_required;
              const isOut = reward.stock <= 0;
              const isRedeeming = redeemingId === reward.id;
              const progressPct = Math.min(100, Math.round((userPoints / (reward.points_required || 1)) * 100));

              return (
                <motion.div
                  key={reward.id}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 transition-all flex flex-col justify-between group overflow-hidden relative"
                >
                  <div className="space-y-3">
                    {/* Image / Thumbnail Container */}
                    <div className="w-full h-44 rounded-2xl bg-slate-100 overflow-hidden relative border border-slate-100 flex items-center justify-center">
                      {reward.image_url ? (
                        <img
                          src={reward.image_url}
                          alt={reward.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-5xl text-slate-400 group-hover:scale-110 transition-transform">🎁</div>
                      )}

                      {/* Category Badge */}
                      <span className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-md text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-white/20">
                        {reward.category || 'Hadiah'}
                      </span>

                      {/* Stock Badge */}
                      <span className={`absolute top-2.5 right-2.5 text-[10px] font-black px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-xs ${
                        isOut
                          ? 'bg-rose-600 text-white'
                          : reward.stock <= 3
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-emerald-800/85 text-emerald-100'
                      }`}>
                        {isOut ? 'Habis' : `Sisa ${reward.stock} unit`}
                      </span>

                      {isOut && (
                        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center text-white text-xs font-black uppercase tracking-wider">
                          Stok Sementara Habis
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-slate-900 leading-snug line-clamp-2 group-hover:text-emerald-700 transition-colors">
                        {reward.name}
                      </h4>
                      {reward.unit && (
                        <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                          Kemasan: {reward.unit}
                        </span>
                      )}
                      {reward.description && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {reward.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                    {/* Points Requirement */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Tukar Hadiah:</span>
                      <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl">
                        <Coins className="w-4 h-4 fill-amber-400 text-amber-600" />
                        <span className="font-black text-amber-900 text-sm">
                          {reward.points_required.toLocaleString('id-ID')}
                        </span>
                        <span className="text-[10px] text-amber-700 font-bold uppercase">Koin</span>
                      </div>
                    </div>

                    {/* Progress Bar Progress Tabungan Koin */}
                    {!isOut && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                          <span>Kemajuan Poin Anda:</span>
                          <span className={canAfford ? 'text-emerald-700 font-black' : 'text-amber-700'}>
                            {canAfford ? '100% Cukup!' : `${progressPct}%`}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              canAfford ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-400 to-amber-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <button
                      type="button"
                      disabled={isOut || isRedeeming}
                      onClick={() => handleRedeem(reward)}
                      className={`w-full py-2.5 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer ${
                        isOut
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : canAfford
                          ? 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-700/25 active:scale-98'
                          : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300/90'
                      }`}
                    >
                      {isRedeeming ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Memproses...
                        </span>
                      ) : canAfford ? (
                        <>
                          <Gift className="w-4 h-4" />
                          <span>Tukar Sekarang</span>
                        </>
                      ) : (
                        <span>Kurang {reward.points_required - userPoints} Koin Lagi</span>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Education FAQ Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
          <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-700" />
            Pertanyaan Seputar Koin Pawon
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <strong className="text-slate-900 block mb-1">Apakah Koin Pawon ada tanggal hangusnya?</strong>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Tidak ada masa hangus. Koin yang Anda kumpulkan dari belanja harian tersimpan selamanya di akun Anda sampai Anda ingin menukarkannya.
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <strong className="text-slate-900 block mb-1">Bagaimana cara hadiah dikirimkan?</strong>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Hadiah sembako otomatis diantarkan bersamaan dengan jadwal kiriman belanja sayur Anda berikutnya oleh kurir resmi JogoPawon.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal Sebelum Poin Ditukarkan */}
      <RewardConfirmationModal
        isOpen={!!rewardToConfirm}
        reward={rewardToConfirm}
        currentUser={currentUser}
        onClose={() => setRewardToConfirm(null)}
        onRequireAuth={() => onRequireAuth()}
        onSuccess={(claimNumber, remainingPoints, rew) => {
          onPointsUpdated(remainingPoints);
          setSuccessMessage(`Klaim hadiah ${rew.name} (No: ${claimNumber}) berhasil dicatat! Menunggu verifikasi admin.`);
          setRewards((prev) =>
            prev.map((r) => (r.id === rew.id ? { ...r, stock: Math.max(0, r.stock - 1) } : r))
          );
        }}
      />
    </div>
  );
};
