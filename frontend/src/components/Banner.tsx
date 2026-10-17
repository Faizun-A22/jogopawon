import React, { useState, useEffect } from 'react';
import { Sparkles, Clock, Truck, ShieldCheck, Tag, Calendar, ShoppingBag, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Banner: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Countdown timer for next PO delivery cycle
  const [timeLeft, setTimeLeft] = useState({ hours: 5, minutes: 42, seconds: 18 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 6, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const slides = [
    {
      title: 'Toko Serba Ada: Stok Ready & Pre-Order',
      subtitle: 'Barang stok ready langsung diantar hari ini! Barang kosong bisa Pre-Order untuk pasokan baru besok.',
      badge: 'BELANJA PRAKTIS SIAP ANTAR',
      bg: 'from-emerald-800 via-emerald-700 to-teal-800',
      tag: '🛍️ Sembako, Sayur, Dapur & Kebutuhan Rumah',
      cta: 'Belanja Sekarang',
    },
    {
      title: 'Diantar Langsung ke Pintu Rumah',
      subtitle: 'Pesan dari HP, kurir langsung mengantar ke rumah Anda dengan aman, cepat, dan rapi.',
      badge: 'PENGANTARAN LOKAL',
      bg: 'from-teal-800 via-emerald-700 to-green-700',
      tag: '🛵 Kurir Khusus JogoPawon Siap Antar',
      cta: 'Cek Area Pengantaran',
    },
    {
      title: 'Bisa Bayar di Tempat (COD)',
      subtitle: 'Belanja tenang tanpa was-was. Cek pesanan Anda saat kurir tiba di rumah, lalu bayar tunai di tempat.',
      badge: 'AMAN & TERPERCAYA',
      bg: 'from-green-800 via-emerald-700 to-teal-700',
      tag: '💵 Bayar Tunai Saat Barang Tiba',
      cta: 'Klaim Gratis Ongkir',
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* Main Promotional Carousel */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg shadow-emerald-950/10 h-48 sm:h-60">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.5 }}
            className={`absolute inset-0 bg-gradient-to-r ${slides[currentSlide].bg} text-white p-5 sm:p-8 flex flex-col justify-between`}
          >
            <div className="absolute right-3 -bottom-5 text-8xl sm:text-9xl opacity-15 select-none pointer-events-none">
              🛒📦
            </div>

            <div className="relative z-10 max-w-xl space-y-1.5 sm:space-y-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-white/20 text-white backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full border border-white/20">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                {slides[currentSlide].badge}
              </span>

              <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight drop-shadow-sm leading-tight">
                {slides[currentSlide].title}
              </h2>

              <p className="text-xs sm:text-sm text-emerald-50/90 font-medium line-clamp-2">
                {slides[currentSlide].subtitle}
              </p>
            </div>

            <div className="relative z-10 flex items-center justify-between pt-2">
              <span className="text-[11px] sm:text-xs font-semibold bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-white/10 backdrop-blur-sm">
                {slides[currentSlide].tag}
              </span>

              <div className="flex gap-1.5">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentSlide ? 'w-6 bg-white' : 'w-2 bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dual Delivery Explainer Bar: Stok Ready vs Pre-Order */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 rounded-3xl p-3.5 sm:p-4 text-white shadow-lg shadow-emerald-950/20 space-y-3 border border-emerald-800/60">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 font-black text-[11px] sm:text-xs tracking-wide bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-xl">
              <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>SISTEM PENGANTARAN FLEKSIBEL</span>
            </div>
            <span className="text-[11px] text-slate-300 hidden sm:inline">
              Stok Ready Langsung Diantar • Pre-Order Siap Pasokan Baru
            </span>
          </div>

          {/* Countdown timer badge */}
          <div className="flex items-center gap-1 text-[11px] font-bold">
            <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="text-slate-300 text-[10px] sm:text-[11px]">Batas PO Besok:</span>
            <div className="flex items-center gap-0.5 font-black text-slate-950">
              <span className="bg-amber-300 px-1.5 py-0.5 rounded text-[11px] font-mono shadow-xs">
                {String(timeLeft.hours).padStart(2, '0')}j
              </span>
              <span className="text-amber-200">:</span>
              <span className="bg-amber-300 px-1.5 py-0.5 rounded text-[11px] font-mono shadow-xs">
                {String(timeLeft.minutes).padStart(2, '0')}m
              </span>
              <span className="text-amber-200">:</span>
              <span className="bg-amber-300 px-1.5 py-0.5 rounded text-[11px] font-mono shadow-xs">
                {String(timeLeft.seconds).padStart(2, '0')}d
              </span>
            </div>
          </div>
        </div>

        {/* 4 Informative Steps */}
        <div className="pt-2 border-t border-emerald-900/80">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <span>✨ Cara Belanja & Pengantaran ke Rumah:</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
            <div className="bg-white/5 hover:bg-white/10 p-2.5 rounded-2xl border border-white/5 transition-colors flex items-start gap-2">
              <span className="text-xl shrink-0">🚀</span>
              <div>
                <span className="text-[11px] font-black text-emerald-300 block">Stok Ready</span>
                <span className="text-[10px] text-slate-300 block leading-tight">Diantar hari ini juga ke rumah Anda</span>
              </div>
            </div>
            <div className="bg-white/5 hover:bg-white/10 p-2.5 rounded-2xl border border-white/5 transition-colors flex items-start gap-2">
              <span className="text-xl shrink-0">📅</span>
              <div>
                <span className="text-[11px] font-black text-amber-300 block">Pre-Order (PO)</span>
                <span className="text-[10px] text-slate-300 block leading-tight">Jika stok habis, dikirim jadwal pasokan baru</span>
              </div>
            </div>
            <div className="bg-white/5 hover:bg-white/10 p-2.5 rounded-2xl border border-white/5 transition-colors flex items-start gap-2">
              <span className="text-xl shrink-0">🛡️</span>
              <div>
                <span className="text-[11px] font-black text-green-300 block">Garansi 100%</span>
                <span className="text-[10px] text-slate-300 block leading-tight">Barang cacat/kurang langsung diganti baru</span>
              </div>
            </div>
            <div className="bg-white/5 hover:bg-white/10 p-2.5 rounded-2xl border border-white/5 transition-colors flex items-start gap-2">
              <span className="text-xl shrink-0">💵</span>
              <div>
                <span className="text-[11px] font-black text-blue-300 block">Bayar COD</span>
                <span className="text-[10px] text-slate-300 block leading-tight">Cek barang di depan pintu baru bayar</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Value Proposition Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <motion.div
          whileTap={{ scale: 0.98 }}
          className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-100 shadow-2xs hover:shadow-xs flex items-center gap-2.5 transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-100/80 flex items-center justify-center text-emerald-700 shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800 truncate">Kirim Cepat</h4>
            <p className="text-[10px] text-slate-500 truncate">Diantar sampai pintu</p>
          </div>
        </motion.div>

        <motion.div
          whileTap={{ scale: 0.98 }}
          className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-100 shadow-2xs hover:shadow-xs flex items-center gap-2.5 transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-green-100/80 flex items-center justify-center text-green-700 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800 truncate">Kualitas Terjamin</h4>
            <p className="text-[10px] text-slate-500 truncate">QC rapi & aman</p>
          </div>
        </motion.div>

        <motion.div
          whileTap={{ scale: 0.98 }}
          className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-100 shadow-2xs hover:shadow-xs flex items-center gap-2.5 transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-100/80 flex items-center justify-center text-amber-700 shrink-0">
            <Tag className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800 truncate">Harga Terjangkau</h4>
            <p className="text-[10px] text-slate-500 truncate">Harga warung/pasar</p>
          </div>
        </motion.div>

        <motion.div
          whileTap={{ scale: 0.98 }}
          className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-100 shadow-2xs hover:shadow-xs flex items-center gap-2.5 transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-100/80 flex items-center justify-center text-blue-700 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800 truncate">Bisa Bayar COD</h4>
            <p className="text-[10px] text-slate-500 truncate">Cek barang baru bayar</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

