import React from 'react';
import { motion } from 'framer-motion';
import {
  Gift,
  Coins,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Truck,
  Star,
  CheckCircle2,
  Heart,
  ShoppingBag,
  Zap,
  Award,
  ChevronRight,
  TrendingUp,
  Tag,
  Leaf,
  Store,
} from 'lucide-react';
import { Product, CartItem, User, Category, ProductVariant, RewardItem } from '../types';
import { Banner } from './Banner';
import { api } from '../services/api';

interface HomePageProps {
  products: Product[];
  categories: Category[];
  cart: CartItem[];
  onAddToCart: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  onUpdateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  onSelectProduct: (product: Product) => void;
  onOpenRewards: () => void;
  onGoToCatalog: (categoryId?: string) => void;
  currentUser: User | null;
  onRequireAuth: (action?: () => void, message?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  products,
  categories,
  cart,
  onAddToCart,
  onUpdateQuantity,
  onSelectProduct,
  onOpenRewards,
  onGoToCatalog,
  currentUser,
  onRequireAuth,
}) => {
  const [rewards, setRewards] = React.useState<RewardItem[]>([]);

  React.useEffect(() => {
    let isMounted = true;
    api.getRewards()
      .then((items) => {
        if (isMounted && Array.isArray(items)) {
          setRewards(items);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Testimoni Warga & Bunda Pasuruan
  const testimonials = [
    {
      name: 'Ibu Ratna Kumalasari',
      loc: 'Kec. Bugul Kidul, Pasuruan',
      avatar: '👩',
      stars: 5,
      comment:
        'Alhamdulillah sejak langganan di JogoPawon, jam 6 pagi sayur bayam, wortel, sama ayam potong udah standby di depan teras. Masak buat sarapan suami & anak jadi santai tanpa perlu repot subuh-subuh ke pasar basah!',
    },
    {
      name: 'Ibu Siti Khodijah',
      loc: 'Pohjentrek, Kab. Pasuruan',
      avatar: '🧕',
      stars: 5,
      comment:
        'Koin Pawonnya beneran nyata! Bulan kemarin koin belanjaan sayur saya tukar sama Beras Ramos 5kg dan Minyak Goreng 2L tanpa bayar sepeser pun. Belanja sayur dapet bonus sembako gratis!',
    },
    {
      name: 'Ibu Hj. Maryam',
      loc: 'Bangil, Kab. Pasuruan',
      avatar: '👵',
      stars: 5,
      comment:
        'Bawang merahnya Brebes kering askip tanpa busuk, cabai rawitnya pedas segar langsung petik kebun. Timbangan pas dan kurirnya sopan banget. Pokoknya mantap pol JogoPawon!',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* 1. HERO BANNER & PO CUT-OFF PROMOTION */}
      <Banner />

      {/* 2. SAMBUTAN MANIS & KEUNGGULAN UTAMA */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-5 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-700/50">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-200 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>Pasar Segar & Supermarket Subuh Nomor 1 di Pasuruan</span>
          </div>

          <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
            Dapur Wangi, Masakan Bergizi, <br />
            <span className="text-amber-300">Belanja Sayur Subuh Jadi Berkah Berhadiah!</span>
          </h1>

          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-normal">
            Bunda pesan santai dari rumah malam ini, petani kami petik subuh nanti di Nongkojajar & Tosari Bromo. Pagi pukul <strong>06.00 - 08.00 WIB</strong> sayuran hijau segar, sembako, dan bumbu dapur sudah rapi di depan pintu Anda.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => onGoToCatalog()}
              className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 font-black text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-lg shadow-amber-950/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Store className="w-4 h-4 text-amber-900" />
              <span>Buka Katalog Lengkap</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={onOpenRewards}
              className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm px-4 py-3 rounded-2xl border border-white/30 backdrop-blur-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>🪙 Cek Hadiah Koin Pawon</span>
            </motion.button>
          </div>
        </div>

        {/* 4 Keunggulan Cepat Bar */}
        <div className="mt-6 pt-5 border-t border-emerald-700/60 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2.5 bg-white/5 backdrop-blur-xs p-2.5 rounded-2xl border border-white/10">
            <span className="text-xl">🌅</span>
            <div>
              <strong className="block text-white text-[11px] sm:text-xs">Petik Subuh 100%</strong>
              <span className="text-emerald-200/80 text-[10px]">Langsung dari kebun</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-white/5 backdrop-blur-xs p-2.5 rounded-2xl border border-white/10">
            <span className="text-xl">🚚</span>
            <div>
              <strong className="block text-white text-[11px] sm:text-xs">Bebas Ongkir</strong>
              <span className="text-emerald-200/80 text-[10px]">Min. belanja Rp35.000</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-white/5 backdrop-blur-xs p-2.5 rounded-2xl border border-white/10">
            <span className="text-xl">🪙</span>
            <div>
              <strong className="block text-white text-[11px] sm:text-xs">Koin Berhadiah</strong>
              <span className="text-emerald-200/80 text-[10px]">Tukar Kulkas, TV & Emas</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-white/5 backdrop-blur-xs p-2.5 rounded-2xl border border-white/10">
            <span className="text-xl">🛡️</span>
            <div>
              <strong className="block text-white text-[11px] sm:text-xs">Garansi Segar</strong>
              <span className="text-emerald-200/80 text-[10px]">Ada yang layu? Diganti!</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. POJOK KOIN PAWON & HADIAH SEMBAKO GRATIS WIDGET */}
      <div className="bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 rounded-3xl p-4 sm:p-5 text-amber-950 shadow-md relative overflow-hidden border border-amber-300">
        {/* Background glowing blurs */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-yellow-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-600/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3.5">
          {/* Header Row: Title & Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white text-emerald-950 flex items-center justify-center shadow-md font-black text-2xl shrink-0 ring-2 ring-amber-200">
                🪙
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-950">
                    Pojok Koin Pawon
                  </h3>
                  <span className="bg-amber-950 text-amber-100 text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                    BELANJA DAPAT KOIN
                  </span>
                </div>
                <p className="text-xs text-amber-950/85 font-medium">
                  Belanja kebutuhan sayur & sembako harian, kumpulkan Koin Pawon untuk ditukar Sembako Gratis!
                </p>
              </div>
            </div>

            {/* Right: User Points & Action Button */}
            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-2xl p-2 px-3.5 border border-amber-200 shadow-sm shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                  Saldo Koin Bunda
                </span>
                <span className="text-lg sm:text-xl font-black text-amber-950 leading-none">
                  {currentUser?.points !== undefined ? currentUser.points.toLocaleString('id-ID') : '0'}
                </span>
                <span className="text-[10px] text-amber-800 font-bold ml-1">Koin</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={onOpenRewards}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black px-3.5 py-2.5 rounded-xl shadow-xs transition-all ml-1 cursor-pointer flex items-center gap-1"
              >
                <span>Tukar Hadiah</span>
                <span>➔</span>
              </motion.button>
            </div>
          </div>

          {/* 3-Step Clear Explainer Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <div className="bg-white/80 backdrop-blur-sm p-2.5 rounded-2xl border border-white/60 shadow-2xs flex items-center gap-2.5">
              <span className="text-2xl shrink-0">🛒</span>
              <div>
                <strong className="text-slate-900 block text-[11px] sm:text-xs">1. Belanja Harian</strong>
                <span className="text-slate-600 text-[10px]">Pesan sayur, cabai, ayam atau bumbu pawon.</span>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-2.5 rounded-2xl border border-white/60 shadow-2xs flex items-center gap-2.5">
              <span className="text-2xl shrink-0">🪙</span>
              <div>
                <strong className="text-emerald-950 block text-[11px] sm:text-xs">2. Kumpulkan Koin</strong>
                <span className="text-slate-600 text-[10px]">Koin otomatis bertambah di setiap pesanan Anda.</span>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-2.5 rounded-2xl border border-white/60 shadow-2xs flex items-center gap-2.5">
              <span className="text-2xl shrink-0">🎁</span>
              <div>
                <strong className="text-amber-950 block text-[11px] sm:text-xs">3. Tukar Sembako Gratis</strong>
                <span className="text-slate-600 text-[10px]">Klaim Minyak Goreng, Beras, atau Telur!</span>
              </div>
            </div>
          </div>

          {/* Real Reward Preview Chips */}
          <div className="bg-amber-950/10 rounded-2xl p-2.5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-black text-amber-950 shrink-0 flex items-center gap-1">
              <span>🎁 Katalog Hadiah:</span>
            </span>
            <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-bold">
              {rewards.length > 0 ? (
                rewards.slice(0, 6).map((rew) => (
                  <button
                    key={rew.id}
                    type="button"
                    onClick={onOpenRewards}
                    className="bg-white/90 hover:bg-white text-slate-800 px-2.5 py-1 rounded-xl shadow-2xs border border-amber-200 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <span>🎁</span>
                    <span className="max-w-[130px] truncate">{rew.name}</span>
                    <strong className="text-amber-900 font-black">({rew.points_required} Koin)</strong>
                  </button>
                ))
              ) : (
                <button
                  type="button"
                  onClick={onOpenRewards}
                  className="bg-white/90 hover:bg-white text-emerald-800 px-3 py-1 rounded-xl shadow-2xs border border-emerald-200 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>✨</span> Buka Toko Hadiah & Koin Pawon ➔
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. TESTIMONI PELANGGAN PASURUAN (KATA BUNDA HORIZONTAL SLIDER) */}
      <div className="bg-slate-100/70 rounded-3xl p-5 sm:p-7 border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 max-w-4xl">
          <div>
            <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-white text-emerald-800 text-[10px] font-extrabold border border-emerald-200 shadow-2xs mb-1.5">
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
              <span>Keluarga Sehat, Dapur Bahagia</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900">
              Kata Bunda & Warga Pasuruan Tentang JogoPawon
            </h2>
            <p className="text-xs text-slate-500">
              Kepuasan ribuan ibu rumah tangga, warung makan, dan katering yang mempercayakan belanja subuh mereka kepada kami.
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-bold shrink-0 hidden sm:block">
            Geser untuk testimoni lainnya ➔
          </span>
        </div>

        {/* Horizontal Scroll Testimonials */}
        <div className="flex gap-3.5 overflow-x-auto no-scrollbar pb-3 pt-1 px-1 snap-x scroll-smooth">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="w-[280px] sm:w-[320px] md:w-[360px] shrink-0 bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3.5 snap-start"
            >
              <div className="space-y-2.5">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(t.stars)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs sm:text-[13px] text-slate-600 italic leading-relaxed">
                  "{t.comment}"
                </p>
              </div>

              <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center text-base shadow-inner shrink-0">
                  {t.avatar}
                </div>
                <div>
                  <h4 className="font-black text-xs sm:text-sm text-slate-900">{t.name}</h4>
                  <span className="text-[10px] text-slate-400 block">{t.loc}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. CTA DI AKHIR BERANDA: AJAK BUKA KATALOG */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white text-center shadow-lg space-y-3 relative overflow-hidden">
        <div className="max-w-xl mx-auto space-y-2">
          <span className="text-3xl">🛒</span>
          <h3 className="text-lg sm:text-2xl font-black tracking-tight">
            Sudah Tahu Mau Masak Apa Besok Pagi?
          </h3>
          <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
            Yuk pilih bahan masak segar favorit Anda di katalog produk lengkap. Dapatkan bonus poin loyalitas dan potongan gratis ongkir sekarang juga!
          </p>
          <div className="pt-2">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => onGoToCatalog()}
              className="bg-white text-emerald-900 hover:bg-emerald-50 font-black text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-md inline-flex items-center gap-2 transition-all cursor-pointer"
            >
              <Store className="w-4 h-4 text-emerald-700" />
              <span>Buka Seluruh Katalog Sayur & Sembako</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};
