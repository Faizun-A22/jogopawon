import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WhatsAppFloatingButtonProps {
  adminPhone?: string;
  defaultMessage?: string;
}

export const WhatsAppFloatingButton: React.FC<WhatsAppFloatingButtonProps> = ({
  adminPhone = '6289654190596',
  defaultMessage = 'Halo Admin JogoPawon Mart! Saya ingin tanya stok barang / titip belanjaan kebutuhan rumah tangga...',
}) => {
  const [showTooltip, setShowTooltip] = useState(true);

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(defaultMessage);
    const waUrl = `https://wa.me/${adminPhone}?text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-40 flex flex-col items-end gap-2 pointer-events-auto">
      {/* Mini Tooltip Popup */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="relative bg-white text-slate-800 text-xs font-semibold px-3 py-2 rounded-2xl shadow-xl border border-emerald-100 max-w-[200px] flex items-start gap-2"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTooltip(false);
              }}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-full flex items-center justify-center text-[10px]"
              aria-label="Tutup pesan bantuan"
            >
              <X className="w-2.5 h-2.5" />
            </button>
            <span className="text-base leading-none">👋</span>
            <div className="leading-snug">
              <span className="text-emerald-800 font-bold block text-[11px]">Butuh Bantuan?</span>
              <span className="text-[10px] text-slate-500">Tanya stok / request barang via WA</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main WhatsApp Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={handleOpenWhatsApp}
        className="group relative flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white p-3 md:px-4 md:py-3 rounded-full shadow-lg shadow-emerald-600/30 border-2 border-white transition-all cursor-pointer"
        aria-label="Hubungi WhatsApp Customer Service JogoPawon"
      >
        {/* Radar Pulse Effect */}
        <span className="absolute -inset-1 rounded-full bg-emerald-400 opacity-40 animate-ping pointer-events-none" />

        <div className="relative flex items-center justify-center">
          <MessageCircle className="w-6 h-6 fill-white text-emerald-600" />
        </div>

        <span className="hidden md:inline font-bold text-xs tracking-wide">
          Chat CS WhatsApp
        </span>
      </motion.button>
    </div>
  );
};
