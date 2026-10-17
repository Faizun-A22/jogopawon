import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share2, PlusSquare, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isStandaloneMode, isIos, subscribeInstallPrompt, promptInstallApp } from '../utils/pwa';
import confetti from 'canvas-confetti';

interface PwaInstallBannerProps {
  forceOpenIosModal?: boolean;
  onCloseIosModal?: () => void;
}

export const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({
  forceOpenIosModal = false,
  onCloseIosModal,
}) => {
  const [canInstall, setCanInstall] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('jogopawon_pwa_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [showIosModal, setShowIosModal] = useState(forceOpenIosModal);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    if (forceOpenIosModal) {
      setShowIosModal(true);
    }
  }, [forceOpenIosModal]);

  useEffect(() => {
    // If running already installed (standalone mode), do not show install prompt
    if (isStandaloneMode()) {
      setCanInstall(false);
      return;
    }

    // Subscribe to browser install prompt events
    const unsubscribe = subscribeInstallPrompt((available) => {
      // Show if browser offers native install prompt OR if user is on iOS Safari
      setCanInstall(available || isIos());
    });

    return () => unsubscribe();
  }, []);

  const handleInstallClick = async () => {
    const result = await promptInstallApp();
    if (result === 'accepted') {
      setInstalledSuccess(true);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
      });
      setTimeout(() => {
        setCanInstall(false);
      }, 3500);
    } else if (result === 'manual_ios') {
      setShowIosModal(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('jogopawon_pwa_dismissed', 'true');
    } catch (e) {
      // ignore
    }
  };

  const closeIosModal = () => {
    setShowIosModal(false);
    if (onCloseIosModal) {
      onCloseIosModal();
    }
  };

  // Don't render banner if dismissed or already running in standalone PWA mode
  const showBanner = canInstall && !isDismissed && !isStandaloneMode();

  return (
    <>
      {/* 1. Main Install Banner (Mobile & Desktop) */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-16 md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:max-w-md z-40"
          >
            <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-green-900 text-white rounded-2xl p-3.5 shadow-2xl border border-emerald-500/40 backdrop-blur-md relative overflow-hidden">
              {/* Decorative background glow */}
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-emerald-500/20 rounded-full blur-xl pointer-events-none" />

              <div className="flex items-start gap-3 relative z-10">
                {/* App Icon */}
                <div className="relative shrink-0">
                  <img
                    src="/pwa-192x192.png"
                    alt="JogoPawon Icon"
                    className="w-12 h-12 rounded-xl object-contain bg-white p-1 shadow-md border border-emerald-300/30"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-amber-400 text-emerald-950 text-[9px] font-black px-1 rounded-full shadow">
                    PWA
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-sm tracking-tight text-white flex items-center gap-1">
                      Pasang JogoPawon di HP
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    </h4>
                  </div>
                  <p className="text-[11px] text-emerald-100/90 leading-snug mt-0.5">
                    Akses 1-klik di layar utama seperti PlayStore, belanja sayur subuh lebih gesit & hemat kuota!
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-2.5">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={handleInstallClick}
                      className="bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black text-xs px-3.5 py-1.5 rounded-lg shadow-md flex items-center gap-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{isIos() ? 'Petunjuk Pasang' : 'Pasang Sekarang'}</span>
                    </motion.button>
                    <button
                      onClick={handleDismiss}
                      className="text-[11px] text-emerald-200/80 hover:text-white px-2 py-1 rounded transition-colors"
                    >
                      Nanti Saja
                    </button>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={handleDismiss}
                  className="absolute top-0 right-0 text-emerald-300/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Tutup Banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {installedSuccess && (
                <div className="mt-2 pt-2 border-t border-emerald-700/60 flex items-center gap-1.5 text-xs text-amber-200 font-semibold animate-pulse">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Aplikasi JogoPawon berhasil dipasang di layar HP Anda!</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. iOS Safari Step-by-Step Installation Modal */}
      <AnimatePresence>
        {showIosModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                    <Smartphone className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">Pasang di iPhone / iPad</h3>
                    <p className="text-slate-400 text-xs">Petunjuk Safari Layar Utama</p>
                  </div>
                </div>
                <button
                  onClick={closeIosModal}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Steps Guide */}
              <div className="py-4 space-y-3.5">
                {/* Step 1 */}
                <div className="flex items-start gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs text-slate-700 leading-snug">
                    Buka browser <strong>Safari</strong>, lalu ketuk tombol <strong>Bagikan (Share)</strong>{' '}
                    <span className="inline-flex items-center justify-center p-1 bg-white rounded shadow-sm border border-slate-200 text-blue-500 mx-1">
                      <Share2 className="w-3.5 h-3.5" />
                    </span>{' '}
                    di bilah bawah layar HP.
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs text-slate-700 leading-snug">
                    Gulir ke bawah dan pilih opsi{' '}
                    <strong className="text-slate-900">"Tambah ke Layar Utama"</strong> (<em>Add to Home Screen</em>){' '}
                    <span className="inline-flex items-center justify-center p-1 bg-white rounded shadow-sm border border-slate-200 text-slate-700 mx-1">
                      <PlusSquare className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs text-slate-700 leading-snug">
                    Ketuk tombol <strong className="text-emerald-700 font-black">"Tambah" (Add)</strong> di pojok kanan atas. Ikon <strong>JogoPawon</strong> siap dipakai langsung dari layar HP Anda!
                  </div>
                </div>
              </div>

              {/* Close / Got it */}
              <button
                onClick={closeIosModal}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <span>Saya Mengerti</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
