import React, { useState, useEffect } from 'react';
import { RewardItem, User } from '../types';
import { api } from '../services/api';
import { Coins, Gift, Sparkles, CheckCircle2, AlertCircle, X, ChevronRight, ShoppingBag, Flame, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { RewardConfirmationModal } from './RewardConfirmationModal';

interface RewardStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onRequireAuth: (action?: () => void, message?: string) => void;
  onPointsUpdated: (newPoints: number) => void;
}

export const RewardStoreModal: React.FC<RewardStoreModalProps> = ({
  isOpen,
  onClose,
  currentUser,
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
    if (isOpen) {
      loadRewards();
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

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
      onRequireAuth(() => handleRedeem(reward), 'Silakan masuk terlebih dahulu untuk menukarkan poin hadiah Anda.');
      return;
    }

    if (userPoints < reward.points_required) {
      setErrorMessage(`Poin Anda belum cukup. Butuh ${reward.points_required - userPoints} poin lagi untuk menukar ${reward.name}.`);
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    // Buka dialog konfirmasi sebelum poin dipotong
    setRewardToConfirm(reward);
  };

  const categories = [
    { id: 'all', label: '🎁 Semua Hadiah' },
    { id: 'Sembako', label: '🌾 Sembako & Dapur' },
    { id: 'Alat Rumah Tangga', label: '🍳 Alat Rumah Tangga' },
    { id: 'Elektronik', label: '⚡ Elektronik Dapur' },
    { id: 'Voucher', label: '🎟️ Voucher Diskon' },
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
            return cat.includes('elektronik') || cat.includes('listrik');
          }
          return cat === target;
        });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-4 sm:p-5 relative overflow-hidden shrink-0">
          <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-300 to-yellow-400 text-emerald-950 flex items-center justify-center shadow-lg font-black shrink-0 text-2xl">
                🪙
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black flex items-center gap-1.5">
                  Pojok Koin Pawon & Hadiah Gratis
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </h3>
                <p className="text-xs text-emerald-100">
                  Tukar Koin Pawon dengan Sembako, Alat Rumah Tangga & Elektronik Dapur!
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User Points Card & Formula Info */}
          <div className="mt-4 bg-emerald-950/70 rounded-2xl p-3 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="text-left">
                <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-bold block">
                  Saldo Koin Pawon Anda
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-amber-300">
                    {userPoints.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-emerald-200 font-bold">Koin Pawon</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-emerald-100/90 bg-white/10 rounded-xl px-3 py-2 border border-white/10 flex items-start gap-2 leading-relaxed">
              <Gift className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-200 block">Sistem Koin Berkah:</strong>
                Setiap kali Anda belanja, Anda otomatis mendapatkan Koin Belanja yang bisa dikumpulkan dan ditukarkan dengan aneka sembako gratis!
              </div>
            </div>
          </div>
        </div>

        {/* 3-Step Points Explainer Card */}
        <div className="bg-amber-50/70 border-b border-amber-200/60 p-3 sm:px-5">
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] sm:text-xs">
            <div className="bg-white p-2 rounded-xl border border-amber-100 shadow-2xs">
              <span className="text-base sm:text-lg block mb-0.5">🛒</span>
              <strong className="text-slate-800 block text-[10px] sm:text-[11px]">1. Belanja Harian</strong>
              <span className="text-slate-500 text-[9px] sm:text-[10px]">Pesan sayur / sembako</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-amber-100 shadow-2xs">
              <span className="text-base sm:text-lg block mb-0.5">🪙</span>
              <strong className="text-emerald-800 block text-[10px] sm:text-[11px]">2. Kumpulkan Koin</strong>
              <span className="text-slate-500 text-[9px] sm:text-[10px]">Otomatis masuk akun</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-amber-100 shadow-2xs">
              <span className="text-base sm:text-lg block mb-0.5">🎁</span>
              <strong className="text-amber-900 block text-[10px] sm:text-[11px]">3. Tukar Gratis</strong>
              <span className="text-slate-500 text-[9px] sm:text-[10px]">Klaim sembako idaman</span>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                selectedCategory.toLowerCase() === cat.id.toLowerCase()
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Notification alerts */}
        {successMessage && (
          <div className="mx-4 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-800 font-semibold animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Rewards Grid */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Memuat katalog hadiah sembako...
            </div>
          ) : filteredRewards.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Belum ada hadiah di kategori ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredRewards.map((reward) => {
                const canAfford = userPoints >= reward.points_required;
                const pointsShort = reward.points_required - userPoints;
                const progressPercent = Math.min(100, Math.round((userPoints / reward.points_required) * 100));

                return (
                  <div
                    key={reward.id}
                    className="bg-white border border-slate-100 hover:border-emerald-300 rounded-3xl p-3.5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        <img
                          src={reward.image_url}
                          alt={reward.name}
                          className="w-16 h-16 rounded-2xl object-cover bg-slate-50 border border-slate-100 shrink-0 group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            (e.target as any).src = '/logo.webp';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {reward.category}
                          </span>
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug mt-1 truncate">
                            {reward.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                            {reward.description}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar towards this reward */}
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-medium">Progres Poin:</span>
                          <span className={`font-black ${canAfford ? 'text-emerald-700' : 'text-slate-600'}`}>
                            {userPoints} / {reward.points_required} ({progressPercent}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              canAfford ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-amber-400 to-orange-400'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 text-amber-800 font-black text-xs sm:text-sm bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                        <Coins className="w-4 h-4 fill-amber-400 text-amber-600 animate-pulse" />
                        <span>{reward.points_required} Koin</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRedeem(reward)}
                        disabled={redeemingId === reward.id || reward.stock <= 0}
                        className={`px-3.5 py-2 rounded-xl font-black text-xs shadow-xs transition-all flex items-center gap-1 ${
                          reward.stock <= 0
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : canAfford
                            ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white active:scale-95 shadow-emerald-600/25 shadow-md'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {redeemingId === reward.id ? (
                          'Memproses...'
                        ) : reward.stock <= 0 ? (
                          'Stok Habis'
                        ) : canAfford ? (
                          <>
                            <span>Klaim Hadiah</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          `Kurang ${pointsShort} Poin`
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-500 shrink-0">
          Hadiah yang ditukarkan akan dikirim bersama pengantaran sayur subuh Anda berikutnya atau berupa voucher belanja.
        </div>
      </motion.div>

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
