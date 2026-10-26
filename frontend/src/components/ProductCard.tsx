import React from 'react';
import { Product, User } from '../types';
import { Plus, Minus, Star, Sparkles, MapPin, Check, Scale, Coins } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProductCardProps {
  product: Product;
  quantityInCart: number;
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onSelectProduct?: (product: Product) => void;
  currentUser?: User | null;
  onRequireAuth?: (pendingAction?: () => void) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantityInCart,
  onAddToCart,
  onUpdateQuantity,
  onSelectProduct,
  currentUser,
  onRequireAuth,
}) => {
  const currentPrice = product.discount_price || product.price;
  const hasDiscount = product.discount_price && product.discount_price < product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.discount_price!) / product.price) * 100)
    : 0;

  // Hitung Koin Pawon (7% Keuntungan Bersih)
  const cost = product.cost_price > 0 ? product.cost_price : currentPrice * 0.8;
  const profit = Math.max(0, currentPrice - cost);
  const pointsEarned = Math.max(1, Math.floor(profit * 0.07));

  const isOutOfStock = product.stock <= 0;

  const formatRupiah = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return 'Rp ' + Math.round(num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const [isFavorite, setIsFavorite] = React.useState(false);

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(25);
    }
  };

  const handleCardClick = () => {
    if (onSelectProduct) {
      onSelectProduct(product);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={handleCardClick}
      className="bg-white rounded-3xl border border-slate-100 shadow-2xs hover:shadow-xl hover:border-emerald-300 hover:ring-2 hover:ring-emerald-400/20 transition-all overflow-hidden flex flex-col justify-between group cursor-pointer relative"
    >
      {/* Product Image Area */}
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
          loading="lazy"
        />

        {/* Favorite Wishlist Button */}
        <motion.button
          whileTap={{ scale: 0.75 }}
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic();
            setIsFavorite(!isFavorite);
          }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/85 hover:bg-white backdrop-blur-md flex items-center justify-center text-slate-400 hover:text-red-500 shadow-xs transition-colors z-10"
        >
          <span className={`text-xs ${isFavorite ? 'text-red-500' : 'text-slate-400'}`}>
            {isFavorite ? '❤️' : '🤍'}
          </span>
        </motion.button>

        {/* Media Badge (Video / Multiple Photos) */}
        {((product.videos && product.videos.length > 0) || product.video_url) ? (
          <div className="absolute top-2 right-10 z-10 bg-purple-950/85 backdrop-blur-md text-purple-200 text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg shadow-xs flex items-center gap-1 border border-purple-400/30">
            <span>🎥</span>
            <span className="hidden sm:inline">Video</span>
          </div>
        ) : (product.images && product.images.length > 1) ? (
          <div className="absolute top-2 right-10 z-10 bg-slate-950/75 backdrop-blur-md text-slate-200 text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg shadow-xs flex items-center gap-0.5 border border-white/20">
            <span>📷</span>
            <span>{product.images.length}</span>
          </div>
        ) : null}

        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-2 left-2 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-0.5">
            <span>🔥</span>
            <span>HEMAT {discountPercent}%</span>
          </div>
        )}

        {/* Delivery Mode Badge at bottom of Image */}
        <div className="absolute bottom-2 left-2 right-2">
          {product.stock > 0 ? (
            <div className="bg-emerald-950/85 backdrop-blur-md text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-xl flex items-center justify-between border border-emerald-400/40 shadow-sm">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-extrabold">Ready Diantar Hari Ini</span>
              </span>
              <span className="text-emerald-300 font-black ml-1 text-[8px] sm:text-[9px]">
                STOK {product.stock % 1 === 0 ? product.stock : product.stock.toFixed(1)} {product.unit}
              </span>
            </div>
          ) : (
            <div className="bg-amber-950/90 backdrop-blur-md text-amber-200 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-xl flex items-center justify-between border border-amber-400/40 shadow-sm">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-extrabold">PO Panen Subuh Besok</span>
              </span>
              <span className="text-amber-300 font-black ml-1 text-[8px] sm:text-[9px]">SEGAR</span>
            </div>
          )}
        </div>
      </div>

      {/* Product Details */}
      <div className="p-2.5 sm:p-3.5 flex-1 flex flex-col justify-between gap-2">
        <div className="space-y-1">
          {/* Origin & Unit */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500">
            <span className="flex items-center gap-0.5 truncate max-w-[100px] sm:max-w-[130px]" title={product.origin}>
              <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="truncate">{product.origin.split(',')[0]}</span>
            </span>
            <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[9px] sm:text-[10px]">
              /{product.unit}
            </span>
          </div>

          {/* Product Name */}
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
            {product.name}
          </h3>

          {/* Weight Variant Badge if available */}
          {product.variants && product.variants.length > 0 && (
            <div className="flex items-center gap-1 pt-0.5">
              <span className="bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900 border border-emerald-300/80 text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                <Scale className="w-2.5 h-2.5 text-emerald-600" />
                {product.variants.length} Varian Berat (1 Ons - 1 Kg)
              </span>
            </div>
          )}

          {/* Rating, Sold & 1% Loyalty Coin Badge */}
          <div className="flex items-center justify-between gap-1 pt-0.5">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-500">
              <span className="flex items-center gap-0.5 font-bold text-amber-500">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {product.rating.toFixed(1)}
              </span>
              <span>•</span>
              <span className="truncate">Terjual {product.sold_count}+</span>
            </div>

            {/* Loyalty Coins Tag */}
            <div
              className="flex items-center gap-1 bg-gradient-to-r from-amber-50 to-yellow-100 border border-amber-300/80 rounded-lg px-1.5 py-0.5 text-[9px] text-amber-900 font-black shadow-2xs shrink-0"
              title="Dapatkan Koin Pawon dari belanjaan ini untuk ditukar sembako gratis!"
            >
              <span className="text-xs">🪙</span>
              <span>+{pointsEarned} Koin</span>
            </div>
          </div>
        </div>

        {/* Price & Action Button */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
          <div className="min-w-0">
            <div className="text-sm sm:text-base font-black text-emerald-700 tracking-tight truncate">
              {formatRupiah(currentPrice)}
            </div>
            {hasDiscount && (
              <div className="text-[9px] sm:text-[10px] text-slate-400 line-through truncate">
                {formatRupiah(product.price)}
              </div>
            )}
          </div>

          {/* Add to cart / Stepper / Variant selector button */}
          {product.variants && product.variants.length > 0 ? (
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic();
                if (onSelectProduct) {
                  onSelectProduct(product);
                } else {
                  if (!currentUser) {
                    onRequireAuth?.(() => onAddToCart(product));
                    return;
                  }
                  onAddToCart(product);
                }
              }}
              className="px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all shrink-0 font-bold text-[11px] sm:text-xs shadow-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300"
              title="Pilih ukuran berat timbangan"
            >
              <Scale className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pilih Berat</span>
            </motion.button>
          ) : quantityInCart === 0 ? (
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic();
                if (!currentUser) {
                  onRequireAuth?.(() => onAddToCart(product));
                  return;
                }
                onAddToCart(product);
              }}
              className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all shrink-0 font-bold text-[11px] sm:text-xs shadow-xs ${
                product.stock > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white hover:shadow-emerald-600/30'
                  : 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black'
              }`}
              title={product.stock > 0 ? 'Beli Sekarang' : 'Pesan Pre-Order (PO)'}
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{product.stock > 0 ? 'Beli' : 'PO'}</span>
            </motion.button>
          ) : (
            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-xl p-0.5 sm:p-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic();
                  onUpdateQuantity(product.id, -1);
                }}
                className="w-6 h-6 rounded-lg bg-white text-emerald-700 hover:bg-emerald-100 flex items-center justify-center font-bold text-xs shadow-2xs transition-colors"
              >
                <Minus className="w-3 h-3 stroke-[2.5]" />
              </motion.button>
              <span className="text-xs font-black text-emerald-900 w-4 text-center">
                {quantityInCart}
              </span>
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic();
                  if (!currentUser) {
                    onRequireAuth?.(() => onUpdateQuantity(product.id, 1));
                    return;
                  }
                  onUpdateQuantity(product.id, 1);
                }}
                disabled={quantityInCart >= product.stock}
                className="w-6 h-6 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center font-bold text-xs shadow-2xs transition-colors disabled:opacity-50"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
