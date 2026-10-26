import React from 'react';
import { ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileCartBarProps {
  itemCount: number;
  totalAmount: number;
  onOpenCart: () => void;
}

export const MobileCartBar: React.FC<MobileCartBarProps> = ({
  itemCount,
  totalAmount,
  onOpenCart,
}) => {
  if (itemCount === 0) return null;

  const formatRupiah = (val: number | string) => { const num = typeof val === 'string' ? parseFloat(val) : val; return 'Rp ' + Math.round(num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(30);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 250 }}
        className="md:hidden fixed bottom-20 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-3 right-3 z-30"
      >
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-green-800 text-white p-2.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border border-emerald-400/40 backdrop-blur-md">
          {/* Left summary */}
          <div className="flex items-center gap-2.5 pl-1 min-w-0">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white shadow-inner">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-emerald-900">
                {itemCount}
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-emerald-200 block font-medium truncate">Total PO Sayur:</span>
              <span className="text-sm font-black tracking-tight text-white block truncate">
                {formatRupiah(totalAmount)}
              </span>
            </div>
          </div>

          {/* Right Checkout button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              triggerHaptic();
              onOpenCart();
            }}
            className="bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl shadow-md flex items-center gap-1.5 transition-all shrink-0 animate-pulse-subtle"
          >
            <span>Checkout PO</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
