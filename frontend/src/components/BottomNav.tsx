import React from 'react';
import { motion } from 'framer-motion';
import { User } from '../types';

export type MainNavTab = 'home' | 'catalog' | 'coins' | 'cart' | 'profile';

interface BottomNavProps {
  activeTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
  cartCount: number;
  hasActiveOrder?: boolean;
  currentUser?: User | null;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  cartCount,
  hasActiveOrder = false,
  currentUser,
}) => {
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20);
    }
  };

  const userPoints = currentUser?.points || 0;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/98 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.12)] px-1 pt-2 pb-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] transition-all select-none">
      <div className="grid grid-cols-5 items-end justify-items-center max-w-md mx-auto w-full">
        {/* Tab 1: Beranda */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          onClick={() => {
            triggerHaptic();
            onTabChange('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="w-full flex flex-col items-center justify-center py-0.5 transition-all cursor-pointer"
        >
          <div className="relative flex items-center justify-center h-6">
            <span className="text-xl leading-none">🏠</span>
          </div>
          <span
            className={`text-[10px] leading-tight mt-1 tracking-tight text-center truncate block w-full ${
              activeTab === 'home' ? 'font-black text-emerald-700' : 'font-semibold text-slate-500 hover:text-slate-700'
            }`}
          >
            Beranda
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full mt-0.5 transition-all ${
              activeTab === 'home' ? 'bg-emerald-600 scale-100' : 'bg-transparent scale-0'
            }`}
          />
        </motion.button>

        {/* Tab 2: Katalog Belanja */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          onClick={() => {
            triggerHaptic();
            onTabChange('catalog');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="w-full flex flex-col items-center justify-center py-0.5 transition-all cursor-pointer"
        >
          <div className="relative flex items-center justify-center h-6">
            <span className="text-xl leading-none">🥬</span>
          </div>
          <span
            className={`text-[10px] leading-tight mt-1 tracking-tight text-center truncate block w-full ${
              activeTab === 'catalog' ? 'font-black text-emerald-700' : 'font-semibold text-slate-500 hover:text-slate-700'
            }`}
          >
            Katalog
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full mt-0.5 transition-all ${
              activeTab === 'catalog' ? 'bg-emerald-600 scale-100' : 'bg-transparent scale-0'
            }`}
          />
        </motion.button>

        {/* Tab 3: Koin Pawon & Hadiah (Special Center) */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          onClick={() => {
            triggerHaptic();
            onTabChange('coins');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="w-full flex flex-col items-center justify-center py-0.5 transition-all cursor-pointer group"
        >
          <div className="relative flex items-center justify-center h-6">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shadow-xs transition-all ${
                activeTab === 'coins'
                  ? 'bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-500 ring-2 ring-amber-400'
                  : 'bg-amber-100 hover:bg-amber-200'
              }`}
            >
              <span className="text-xs leading-none">🪙</span>
            </div>
            {userPoints > 0 && (
              <span className="absolute -top-1 -right-2 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                {userPoints}
              </span>
            )}
          </div>
          <span
            className={`text-[10px] leading-tight mt-1 tracking-tight text-center truncate block w-full ${
              activeTab === 'coins' ? 'font-black text-amber-950' : 'font-semibold text-slate-500 hover:text-slate-700'
            }`}
          >
            Koin Pawon
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full mt-0.5 transition-all ${
              activeTab === 'coins' ? 'bg-amber-500 scale-100' : 'bg-transparent scale-0'
            }`}
          />
        </motion.button>

        {/* Tab 4: Keranjang Belanja */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          onClick={() => {
            triggerHaptic();
            onTabChange('cart');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="w-full flex flex-col items-center justify-center py-0.5 transition-all cursor-pointer"
        >
          <div className="relative flex items-center justify-center h-6">
            <span className="text-xl leading-none">🛍️</span>
            {cartCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-2.5 bg-gradient-to-r from-rose-500 to-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md ring-2 ring-white"
              >
                {cartCount}
              </motion.span>
            )}
          </div>
          <span
            className={`text-[10px] leading-tight mt-1 tracking-tight text-center truncate block w-full ${
              activeTab === 'cart' ? 'font-black text-emerald-700' : 'font-semibold text-slate-500 hover:text-slate-700'
            }`}
          >
            Keranjang
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full mt-0.5 transition-all ${
              activeTab === 'cart' ? 'bg-emerald-600 scale-100' : 'bg-transparent scale-0'
            }`}
          />
        </motion.button>

        {/* Tab 5: Akun / Profil */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          onClick={() => {
            triggerHaptic();
            onTabChange('profile');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="w-full flex flex-col items-center justify-center py-0.5 transition-all cursor-pointer"
        >
          <div className="relative flex items-center justify-center h-6">
            {currentUser ? (
              <div
                className={`w-5 h-5 rounded-full overflow-hidden text-white font-black text-[9px] flex items-center justify-center shadow-xs ${
                  activeTab === 'profile' ? 'bg-emerald-700 ring-2 ring-emerald-500' : 'bg-emerald-600'
                }`}
              >
                {currentUser.avatar_url ? (
                  <img src={currentUser.avatar_url} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  currentUser.name.charAt(0).toUpperCase()
                )}
              </div>
            ) : (
              <span className="text-xl leading-none">👤</span>
            )}
            {hasActiveOrder && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-ping" />
            )}
          </div>
          <span
            className={`text-[10px] leading-tight mt-1 tracking-tight text-center truncate block w-full ${
              activeTab === 'profile' ? 'font-black text-emerald-700' : 'font-semibold text-slate-500 hover:text-slate-700'
            }`}
          >
            {currentUser ? currentUser.name.split(' ')[0] : 'Akun'}
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full mt-0.5 transition-all ${
              activeTab === 'profile' ? 'bg-emerald-600 scale-100' : 'bg-transparent scale-0'
            }`}
          />
        </motion.button>
      </div>
    </nav>
  );
};
