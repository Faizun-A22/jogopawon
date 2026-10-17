import React, { useState } from 'react';
import { ShoppingCart, Search, MapPin, ShieldCheck, Clock, User as UserIcon, LogOut, Smartphone, Download, Coins, Gift, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../types';

export type HeaderNavTab = 'home' | 'catalog' | 'coins' | 'cart' | 'profile';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currentUser?: User | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  onOpenInstall?: () => void;
  onOpenRewards?: () => void;
  onOpenProfile?: () => void;
  onOpenOrderHistory?: () => void;
  currentTab?: HeaderNavTab;
  onTabChange?: (tab: HeaderNavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  onOpenCart,
  searchQuery,
  onSearchChange,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenInstall,
  onOpenRewards,
  onOpenProfile,
  onOpenOrderHistory,
  currentTab = 'home',
  onTabChange,
}) => {
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-sm transition-all">
      {/* Top Banner Bar - Shopee style notice without ANY admin links */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-green-700 text-white text-[11px] sm:text-xs py-1.5 px-3 sm:px-4 font-medium overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <span className="flex items-center gap-1.5 truncate">
              <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-pulse" />
              <strong className="text-amber-200 shrink-0">Bisa Kirim Hari Ini & PO:</strong>
              <span className="truncate">Stok ready langsung diantar! Barang PO dikirim pasokan baru besok.</span>
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenInstall}
              className="bg-emerald-600/90 hover:bg-emerald-500 text-amber-200 hover:text-white px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold flex items-center gap-1 border border-emerald-400/40 transition-all shadow-xs cursor-pointer"
              title="Pasang Aplikasi JogoPawon di Layar Utama HP / Laptop"
            >
              <Smartphone className="w-3 h-3 text-amber-300 animate-pulse" />
              <span>Pasang App</span>
            </button>
            <div className="hidden sm:flex items-center gap-1 text-emerald-100 text-[11px] shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Garansi 100% Produk Berkualitas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 space-y-2 sm:space-y-0">
        {/* Row 1: Logo, Delivery Location Pill & Actions */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-4 w-full">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="cursor-pointer flex items-center gap-1.5 sm:gap-2.5 shrink-0"
            onClick={() => {
              onTabChange?.('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <img
              src="/logo.webp"
              alt="JogoPawon Logo"
              className="h-8 sm:h-12 w-auto object-contain shrink-0"
            />
            <div className="hidden sm:block">
              <div className="flex items-center gap-1">
                <span className="text-base sm:text-lg font-black tracking-tight text-emerald-950">
                  Jogo<span className="text-emerald-700">Pawon</span>
                </span>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-full border border-emerald-300/40">
                  MART
                </span>
              </div>
              <p className="text-[9px] text-slate-500 font-medium">
                Supermarket & Toko Belanja Online
              </p>
            </div>
          </motion.div>

          {/* Location Delivery Selector (Visible on both mobile & desktop) */}
          <div className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-700 bg-slate-100/90 hover:bg-slate-100 border border-slate-200/90 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full truncate max-w-[120px] sm:max-w-xs transition-colors shrink min-w-0">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-bold text-slate-800 truncate">Pasuruan & Sekitarnya</span>
          </div>

          {/* Desktop Store Tab Switcher (Beranda Promo vs Katalog Belanja vs Koin) */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => {
                onTabChange?.('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'home'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-800 hover:bg-white/60'
              }`}
            >
              <span>🏠</span>
              <span>Beranda</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onTabChange?.('catalog');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'catalog'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-800 hover:bg-white/60'
              }`}
            >
              <span>🥬</span>
              <span>Katalog</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onTabChange?.('coins');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'coins'
                  ? 'bg-amber-500 text-amber-950 font-black shadow-xs'
                  : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/60'
              }`}
            >
              <span>🪙</span>
              <span>Koin Pawon</span>
            </button>
          </div>

          {/* Desktop Search Bar (md and up) */}
          <div className="hidden md:flex flex-1 max-w-xl mx-2">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  if (e.target.value && currentTab !== 'catalog') {
                    onTabChange?.('catalog');
                  }
                }}
                placeholder="Cari beras, minyak, telur, sayur, daging, bumbu dapur, sabun..."
                className="w-full bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-sm text-slate-800 placeholder-slate-400 rounded-full pl-10 pr-24 py-2 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-16 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold px-1"
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (currentTab !== 'catalog') onTabChange?.('catalog');
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              >
                Cari
              </button>
            </div>
          </div>

          {/* Right Action Icons (User + Cart) */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {/* Install App Button (Desktop) */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onOpenInstall}
              type="button"
              className="hidden lg:flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold py-1.5 px-3 rounded-2xl transition-all shadow-xs cursor-pointer"
              title="Pasang Aplikasi JogoPawon di Layar Utama"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
              <span>Install App</span>
            </motion.button>

            {/* Loyalty Points Pill (Desktop only - mobile accesses this via BottomNav) */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                if (onTabChange) onTabChange('coins');
                else onOpenRewards?.();
              }}
              type="button"
              className={`hidden sm:flex items-center gap-1.5 border text-xs font-black py-1.5 px-2.5 sm:px-3 rounded-2xl shadow-sm transition-all cursor-pointer shrink-0 ${
                currentTab === 'coins'
                  ? 'bg-amber-400 border-amber-500 text-amber-950 ring-2 ring-amber-300'
                  : 'bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 hover:from-amber-400 hover:to-yellow-500 border-amber-400/80 text-amber-950'
              }`}
              title="Buka Halaman Pojok Koin Pawon & Hadiah Gratis"
            >
              <span className="text-sm animate-pulse">🪙</span>
              <span className="text-[11px] sm:text-xs tracking-tight">
                {currentUser?.points !== undefined ? (
                  <span>
                    <strong>{currentUser.points}</strong> Koin
                  </span>
                ) : (
                  <span>Koin Pawon</span>
                )}
              </span>
              <span className="hidden lg:inline text-[9px] bg-amber-900/15 text-amber-950 px-1.5 py-0.2 rounded-md font-extrabold uppercase">
                Tukar Sembako
              </span>
            </motion.button>

            {/* User Account / Login Button */}
            {currentUser ? (
              <div className="relative">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold py-1 px-1.5 sm:py-1.5 sm:px-3 rounded-2xl transition-all"
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center shadow-xs">
                    {currentUser.avatar_url ? (
                      <img src={currentUser.avatar_url} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      currentUser.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="hidden sm:inline max-w-[90px] truncate">{currentUser.name}</span>
                </motion.button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 5 }}
                      className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 text-xs space-y-1"
                    >
                      <div className="p-2 border-b border-slate-100">
                        <p className="font-bold text-slate-800 truncate">{currentUser.name}</p>
                        <p className="text-[10px] text-slate-400">{currentUser.phone}</p>
                        <div className="mt-2 flex items-center justify-between bg-amber-50 rounded-xl p-1.5 border border-amber-200">
                          <span className="text-[11px] font-black text-amber-900 flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5 fill-amber-400 text-amber-600" />
                            {currentUser.points || 0} Poin
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setShowUserMenu(false);
                              if (onTabChange) onTabChange('coins');
                              else onOpenRewards?.();
                            }}
                            className="text-[10px] bg-amber-500 hover:bg-amber-600 text-white font-bold px-2.5 py-0.5 rounded-lg shadow-xs"
                          >
                            Tukar
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          if (onTabChange) onTabChange('profile');
                          else onOpenProfile?.();
                        }}
                        className="w-full flex items-center gap-2 text-left p-2 rounded-xl text-slate-700 hover:bg-slate-50 font-bold transition-colors cursor-pointer"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
                        Profil & Alamat Saya
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          if (onOpenOrderHistory) onOpenOrderHistory();
                          else onTabChange?.('profile');
                        }}
                        className="w-full flex items-center gap-2 text-left p-2 rounded-xl text-slate-700 hover:bg-slate-50 font-bold transition-colors cursor-pointer"
                      >
                        <Package className="w-3.5 h-3.5 text-emerald-600" />
                        Riwayat Pesanan Saya
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onLogout?.();
                        }}
                        className="w-full flex items-center gap-2 text-left p-2 rounded-xl text-red-600 hover:bg-red-50 font-bold transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Keluar (Logout)
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (onTabChange) onTabChange('profile');
                  else onOpenAuth?.();
                }}
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[11px] sm:text-xs font-bold py-1.5 px-2.5 sm:px-3.5 rounded-2xl shadow-xs transition-all shrink-0"
              >
                <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Masuk</span>
              </motion.button>
            )}

            {/* Cart Button with Animated Bounce */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                if (onTabChange) onTabChange('cart');
                else onOpenCart();
              }}
              className={`relative p-2 sm:p-2.5 rounded-2xl border transition-all shadow-xs flex items-center justify-center shrink-0 ${
                currentTab === 'cart'
                  ? 'bg-emerald-700 text-white border-emerald-800 ring-2 ring-emerald-500'
                  : 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border-emerald-200'
              }`}
              aria-label="Buka Keranjang"
            >
              <ShoppingCart className={`w-4 h-4 sm:w-5 sm:h-5 ${currentTab === 'cart' ? 'text-white' : 'text-emerald-700'}`} />
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.25, 1] }}
                  transition={{ duration: 0.3 }}
                  className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] sm:text-[11px] font-black w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shadow-md ring-2 ring-white"
                >
                  {cartCount}
                </motion.span>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </header>
  );
};

