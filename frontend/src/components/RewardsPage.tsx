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

  const userPoints = currentUser?.points || 0;

  useEffect(() => {
    loadRewards();
  }, []);

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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {filteredRewards.map((reward) => {
              const canAfford = userPoints >= reward.points_required;
              const isOut = reward.stock <= 0;
              const isRedeeming = redeemingId === reward.id;

              return (
                <div
                  key={reward.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Image / Thumbnail */}
                    <div className="w-full h-36 rounded-xl bg-slate-100 overflow-hidden relative border border-slate-100 flex items-center justify-center">
                      {reward.image_url ? (
                        <img
                          src={reward.image_url}
                          alt={reward.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-4xl text-slate-400">🎁</div>
                      )}
                      <span className="absolute top-2 left-2 bg-emerald-800/90 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                        {reward.category || 'Hadiah'}
                      </span>
                      {isOut && (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center text-white text-xs font-extrabold uppercase tracking-wider">
                          Stok Habis
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                        {reward.name}
                      </h4>
                      {reward.description && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {reward.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Koin Diperlukan:</span>
                      <span className="font-black text-amber-700 flex items-center gap-1 text-sm">
                        <span>🪙</span>
                        <span>{reward.points_required.toLocaleString('id-ID')}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Sisa Stok:</span>
                      <span
                        className={`font-bold ${
                          reward.stock > 3
                            ? 'text-emerald-700'
                            : reward.stock > 0
                            ? 'text-amber-600'
                            : 'text-red-500'
                        }`}
                      >
                        {reward.stock > 0 ? `${reward.stock} unit` : 'Habis'}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isOut || isRedeeming}
                      onClick={() => handleRedeem(reward)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                        isOut
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : canAfford
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-600/25 active:scale-98'
                          : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300/80'
                      }`}
                    >
                      {isRedeeming ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Memproses...
                        </span>
                      ) : canAfford ? (
                        <>
                          <Gift className="w-3.5 h-3.5" />
                          <span>Tukar Sekarang</span>
                        </>
                      ) : (
                        <span>Kurang {reward.points_required - userPoints} Koin Lagi</span>
                      )}
                    </button>
                  </div>
                </div>
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
