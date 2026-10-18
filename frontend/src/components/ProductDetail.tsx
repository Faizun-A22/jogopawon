import React, { useState, useEffect, useRef } from 'react';
import { Product, Review, User, ProductVariant } from '../types';
import { api } from '../services/api';
import {
  ArrowLeft,
  Star,
  Sparkles,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Share2,
  Heart,
  Plus,
  Minus,
  ShoppingCart,
  MessageSquare,
  ThumbsUp,
  Truck,
  Leaf,
  Info,
  Check,
  ChevronRight,
  Send,
  X,
  Lock,
  Scale,
  Coins,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface ProductDetailProps {
  product: Product;
  allProducts: Product[];
  quantityInCart: number;
  onBack: () => void;
  onAddToCart: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onBuyNow: (product: Product, quantity: number, variant?: ProductVariant) => void;
  onSelectProduct: (product: Product) => void;
  cartCount: number;
  onOpenCart: () => void;
  currentUser?: User | null;
  onRequireAuth?: (pendingAction?: () => void) => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({
  product,
  allProducts,
  quantityInCart,
  onBack,
  onAddToCart,
  onUpdateQuantity,
  onBuyNow,
  onSelectProduct,
  cartCount,
  onOpenCart,
  currentUser,
  onRequireAuth,
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'photo' | '5star'>('all');
  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  const variantSectionRef = useRef<HTMLDivElement>(null);

  // Stepper quantity for detail page
  const [orderQuantity, setOrderQuantity] = useState(1);

  // Custom Budget Mode (e.g. Sawi Rp 2.000 walau 1 ikat Rp 5.000)
  const isCustomBudgetAllowed = Boolean(product.allow_custom_budget);
  const minBudget = product.min_custom_budget || 1000;
  const [isCustomBudgetMode, setIsCustomBudgetMode] = useState<boolean>(false);
  const [customBudgetAmount, setCustomBudgetAmount] = useState<number>(minBudget);

  // Selected variant state (e.g. 1 Ons, 1/4 kg, 1/2 kg, 3/4 kg, 1 kg)
  // Wajib tidak aktif otomatis di awal! User harus klik sendiri varian yang diinginkan.
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  useEffect(() => {
    setSelectedVariant(null);
    setOrderQuantity(1);
    setIsCustomBudgetMode(false);
    setCustomBudgetAmount(product.min_custom_budget || 1000);
  }, [product]);

  // Media gallery list (photos & videos)
  const mediaList = React.useMemo(() => {
    const list: Array<{ type: 'image' | 'video'; url: string }> = [];
    const imgs = product.images && product.images.length > 0 ? product.images : (product.image_url ? [product.image_url] : []);
    imgs.forEach((url) => {
      if (url && !list.some((m) => m.url === url)) {
        list.push({ type: 'image', url });
      }
    });
    const vids = product.videos && product.videos.length > 0 ? product.videos : (product.video_url ? [product.video_url] : []);
    vids.forEach((url) => {
      if (url && !list.some((m) => m.url === url)) {
        list.push({ type: 'video', url });
      }
    });
    return list;
  }, [product]);

  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  useEffect(() => {
    setActiveMediaIndex(0);
  }, [product]);

  const activeMedia = mediaList[activeMediaIndex] || { type: 'image', url: product.image_url };

  const hasVariants = Boolean(product.variants && product.variants.length > 0);
  const isVariantMissing = !isCustomBudgetMode && hasVariants && !selectedVariant;

  const variantPrices = hasVariants ? product.variants!.map((v) => v.price) : [];
  const minVariantPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : (product.discount_price || product.price);
  const maxVariantPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : (product.discount_price || product.price);

  // Unit price logic:
  // Jika custom budget aktif, harga = customBudgetAmount
  const baseProductPrice = product.discount_price || product.price;
  const baseCostPrice = product.cost_price > 0 ? product.cost_price : baseProductPrice * 0.7;

  const unitPrice = isCustomBudgetMode
    ? customBudgetAmount
    : (selectedVariant ? selectedVariant.price : baseProductPrice);

  // Total price multiplied by selected quantity (bagian hijau)
  const totalPrice = isCustomBudgetMode ? customBudgetAmount * orderQuantity : unitPrice * orderQuantity;

  const activePrice = unitPrice;
  // Proporsional modal jika custom budget:
  const activeCost = isCustomBudgetMode
    ? (baseProductPrice > 0 ? (baseCostPrice * (customBudgetAmount / baseProductPrice)) : customBudgetAmount * 0.7)
    : (selectedVariant ? selectedVariant.cost_price : baseCostPrice);

  const activeProfit = Math.max(0, activePrice - activeCost);
  const singlePoints = Math.max(0, Math.floor(activeProfit * 0.07));
  const activePoints = singlePoints * orderQuantity;

  // Proporsi porsi ikat / porsi piring jika custom budget:
  const customProportion = baseProductPrice > 0 ? (customBudgetAmount / baseProductPrice) : 1;
  const customProportionText = (() => {
    const unitLower = (product.unit || '').toLowerCase();
    if (unitLower.includes('ikat')) {
      const porsi = Math.round(customProportion * 10) / 10;
      return `Setara ±${porsi} ikat (${Math.round(customProportion * 100)}% porsi ikat)`;
    }
    if (unitLower.includes('kg')) {
      const gram = Math.round(customProportion * 1000);
      return `Setara ±${gram} gram`;
    }
    return `Setara ${Math.round(customProportion * 100)}% porsi standar ${product.unit}`;
  })();

  const maxAllowedQty = (() => {
    if (product.stock <= 0) return 99;
    const unitLower = (product.unit || '').toLowerCase();
    const isKg = unitLower.includes('kg') || unitLower.includes('kilo');
    if (isKg && selectedVariant && selectedVariant.weight_g && selectedVariant.weight_g > 0) {
      const stockInGrams = product.stock * 1000;
      return Math.max(1, Math.floor(stockInGrams / selectedVariant.weight_g));
    }
    return Math.max(1, Math.floor(product.stock));
  })();

  // Write Review Form State
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerLocation, setReviewerLocation] = useState('');
  const [reviewerRating, setReviewerRating] = useState(5);
  const [reviewerComment, setReviewerComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Liked review IDs tracker
  const [likedReviews, setLikedReviews] = useState<{ [id: string]: boolean }>({});

  const currentPrice = totalPrice;
  const hasDiscount = !selectedVariant && product.discount_price && product.discount_price < product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.discount_price!) / product.price) * 100)
    : 0;

  const isOutOfStock = product.stock <= 0;

  const formatRupiah = (val: number) => {
    return 'Rp' + val.toLocaleString('id-ID');
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleVariantMissingAlert = () => {
    triggerToast('⚠️ Silakan pilih varian berat timbangan terlebih dahulu!');
    if (variantSectionRef.current) {
      variantSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Load reviews from API
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setLoadingReviews(true);
    api.getProductReviews(product.id)
      .then((data) => {
        setReviews(data);
      })
      .catch((err) => {
        console.warn('Gagal memuat ulasan produk:', err);
      })
      .finally(() => {
        setLoadingReviews(false);
      });
  }, [product.id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    triggerToast('Tautan produk berhasil disalin!');
  };

  const handleLikeReview = (reviewId: string) => {
    setLikedReviews((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  };

  const handleAddReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim() || !reviewerComment.trim()) {
      alert('Mohon isi nama dan komentar ulasan Anda.');
      return;
    }

    setSubmittingReview(true);
    try {
      const newRev = await api.addProductReview(product.id, {
        user_name: reviewerName.trim(),
        location: reviewerLocation.trim() || 'Pelanggan JogoPawon',
        rating: reviewerRating,
        comment: reviewerComment.trim(),
        date: 'Baru saja',
        verified_buyer: true,
        likes: 1,
      });

      setReviews((prev) => [newRev, ...prev]);
      setIsWriteReviewOpen(false);
      setReviewerName('');
      setReviewerLocation('');
      setReviewerComment('');
      setReviewerRating(5);

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
      });
      triggerToast('Terima kasih! Ulasan Anda berhasil diterbitkan.');
    } catch (err) {
      alert('Gagal mengirim ulasan, coba sesaat lagi.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (selectedFilter === 'photo') return r.images && r.images.length > 0;
    if (selectedFilter === '5star') return r.rating === 5;
    return true;
  });

  // Recommended related vegetables
  const relatedProducts = allProducts
    .filter((p) => p.id !== product.id && (p.category_id === product.category_id || p.is_popular))
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-50 pb-28 md:pb-16 font-sans">
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-900/95 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-2xl shadow-xl border border-emerald-500/40 flex items-center gap-2 backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{showToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-800" />
            <span className="text-xs sm:text-sm font-bold hidden sm:inline text-slate-700">Kembali</span>
          </motion.button>

          <div className="flex-1 min-w-0 text-center sm:text-left px-2">
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {product.name}
            </h1>
            <p className="text-[10px] sm:text-xs text-emerald-600 font-semibold truncate flex items-center justify-center sm:justify-start gap-1">
              <Sparkles className="w-3 h-3 inline" />
              PO Panen Subuh Besok (03:00 WIB)
            </p>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleCopyLink}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              title="Bagikan Tautan Produk"
            >
              <Share2 className="w-5 h-5" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onOpenCart}
              className="relative p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              title="Buka Keranjang"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-emerald-600 text-white text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Product Content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* LEFT COLUMN: Gallery & Freshness Highlights (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="relative aspect-square rounded-3xl overflow-hidden bg-slate-900 shadow-sm border border-slate-200/80 group"
            >
              {activeMedia.type === 'video' ? (
                <video
                  key={activeMedia.url}
                  src={activeMedia.url}
                  controls
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <img
                  src={activeMedia.url}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              )}

              {/* Discount Badge */}
              {hasDiscount && (
                <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-black px-3 py-1 rounded-xl shadow-md">
                  HEMAT {discountPercent}%
                </div>
              )}

              {/* Flash sale tag */}
              {product.is_flash_sale && (
                <div className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-xl shadow-md flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  SUPER DEAL
                </div>
              )}

              {/* Freshness banner overlay */}
              <div className="absolute bottom-3 left-3 right-3 bg-slate-950/75 backdrop-blur-md rounded-2xl p-2.5 text-white border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-200">{product.freshness}</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-300">Grade A Super</span>
              </div>
            </motion.div>

            {/* Thumbnail Gallery Ribbon if multiple media exist */}
            {mediaList.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {mediaList.map((m, idx) => (
                  <button
                    key={`detail-thumb-${idx}`}
                    type="button"
                    onClick={() => setActiveMediaIndex(idx)}
                    className={`relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 border-2 transition-all ${
                      activeMediaIndex === idx
                        ? 'border-emerald-600 ring-2 ring-emerald-500/30 scale-105 shadow-sm'
                        : 'border-slate-200 hover:border-slate-400 opacity-70'
                    }`}
                  >
                    {m.type === 'video' ? (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                        <video src={m.url} className="w-full h-full object-cover opacity-60" preload="metadata" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <Play className="w-4 h-4 text-white drop-shadow fill-white" />
                        </div>
                        <span className="absolute bottom-0.5 right-0.5 bg-purple-600 text-[8px] font-bold text-white px-1 rounded">
                          VID
                        </span>
                      </div>
                    ) : (
                      <img src={m.url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Freshness & Quality Assurances */}
            <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-2xs space-y-3">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                4 Standar Jaminan Sayur JogoPawon
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-start gap-2 p-2.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/60">
                  <span className="text-base shrink-0 mt-0.5">🌿</span>
                  <div>
                    <span className="font-bold text-slate-900 block">Panen Subuh 03:00</span>
                    <span className="text-[10px] text-slate-500">Dipetik saat embun pagi</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-2xl bg-cyan-50/60 border border-cyan-100/60">
                  <span className="text-base shrink-0 mt-0.5">❄️</span>
                  <div>
                    <span className="font-bold text-slate-900 block">Rantai Dingin & Es</span>
                    <span className="text-[10px] text-slate-500">Suhu terjaga anti layu</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/60">
                  <span className="text-base shrink-0 mt-0.5">🛡️</span>
                  <div>
                    <span className="font-bold text-slate-900 block">Garansi 100% Retur</span>
                    <span className="text-[10px] text-slate-500">Ganti baru jika layu</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-2xl bg-amber-50/60 border border-amber-100/60">
                  <span className="text-base shrink-0 mt-0.5">🛵</span>
                  <div>
                    <span className="font-bold text-slate-900 block">Kurir Sayur Khusus</span>
                    <span className="text-[10px] text-slate-500">Box sekat anti tertindih</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Product Info, Ordering & PO Timeline (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Title, Origin & Rating */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  {product.origin}
                </span>
                <span>•</span>
                <span className="text-slate-400 font-medium">Satuan: /{product.unit}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {product.name}
              </h2>

              <div className="flex items-center flex-wrap gap-4 text-xs text-slate-600 pt-1">
                <div className="flex items-center gap-1 text-amber-500 font-extrabold">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm">{product.rating.toFixed(1)}</span>
                  <span className="text-slate-400 font-normal">({reviews.length} ulasan)</span>
                </div>
                <span className="text-slate-300">•</span>
                <div className="text-slate-600 font-semibold">
                  Terjual <span className="font-black text-slate-800">{product.sold_count}+</span> {product.unit}
                </div>
                <span className="text-slate-300">•</span>
                <div className={`font-bold px-2.5 py-1 rounded-xl text-xs flex items-center gap-1.5 ${
                  product.stock > 0
                    ? 'text-emerald-800 bg-emerald-50 border border-emerald-200'
                    : 'text-amber-800 bg-amber-50 border border-amber-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  {product.stock > 0
                    ? `Stok Ready: ${product.stock % 1 === 0 ? product.stock : product.stock.toFixed(2)} ${product.unit} (Bisa Diantar Hari Ini)`
                    : 'Pre-Order (PO): Diantar Jadwal Pasokan Baru'}
                </div>
              </div>

              {/* Product Weight Multiplier Variants (Kelipatan Berat Timbangan) */}
              {product.variants && product.variants.length > 0 && (
                <div ref={variantSectionRef} className="pt-3 border-t border-slate-100 space-y-2 scroll-mt-24">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-emerald-600" />
                      Pilihan Berat Timbangan:
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                      selectedVariant
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-amber-800 bg-amber-50 border-amber-300 animate-pulse'
                    }`}>
                      {selectedVariant ? selectedVariant.name : '⚠️ Silakan Pilih Varian'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {product.variants.map((v) => {
                      const isSelected = !isCustomBudgetMode && selectedVariant?.id === v.id;
                      const vProfit = v.price - v.cost_price;
                      const vPoints = Math.max(0, Math.floor(vProfit * 0.07));

                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setIsCustomBudgetMode(false);
                            setSelectedVariant(v);
                          }}
                          className={`p-2.5 rounded-2xl border text-left transition-all relative cursor-pointer ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/30 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-extrabold text-xs text-slate-900 truncate">
                              {v.name}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                          </div>
                          <div className="mt-1 flex items-baseline justify-between gap-1">
                            <span className="font-black text-xs text-emerald-700">
                              {formatRupiah(v.price)}
                            </span>
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded shrink-0">
                              +{vPoints} Poin
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Budget Mode Selector (Beli Ecer Sesuai Budget Bebas) */}
              {isCustomBudgetAllowed && (
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <span>💡 Pilihan Pembelian:</span>
                    </span>
                    <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-bold">
                      Bisa Beli Ecer Budget
                    </span>
                  </div>

                  {/* Mode Tabs */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setIsCustomBudgetMode(false)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        !isCustomBudgetMode
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {hasVariants ? 'Pilih Varian Timbangan' : `Beli Satuan (${product.unit})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomBudgetMode(true);
                        setSelectedVariant(null);
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        isCustomBudgetMode
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-emerald-700'
                      }`}
                    >
                      <span>🥗 Beli Sesuai Budget (Rp)</span>
                    </button>
                  </div>

                  {/* Custom Budget Input Box */}
                  {isCustomBudgetMode && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-2xl space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-amber-950">
                          Ketik Nominal Budget Anda:
                        </label>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                          Min. {formatRupiah(minBudget)}
                        </span>
                      </div>

                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-500 text-sm">
                          Rp
                        </span>
                        <input
                          type="number"
                          step="500"
                          min={minBudget}
                          value={customBudgetAmount || ''}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value));
                            setCustomBudgetAmount(val);
                          }}
                          placeholder={minBudget.toString()}
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-amber-300 rounded-xl font-black text-base text-slate-900 focus:outline-emerald-600 shadow-2xs"
                        />
                      </div>

                      {/* Quick preset chips */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-amber-900 font-bold mr-1">Contoh Cepat:</span>
                        {[1000, 2000, 3000, 5000].filter((b) => b >= minBudget).map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => setCustomBudgetAmount(chip)}
                            className={`text-[11px] font-black px-2.5 py-1 rounded-lg border transition-all ${
                              customBudgetAmount === chip
                                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                                : 'bg-white hover:bg-amber-100 text-amber-900 border-amber-200'
                            }`}
                          >
                            {formatRupiah(chip)}
                          </button>
                        ))}
                      </div>

                      {/* Estimasi porsi / takaran ikat */}
                      <div className="p-2 bg-white/80 rounded-xl border border-amber-200 text-xs flex items-center justify-between">
                        <span className="text-[11px] text-slate-600 font-medium">Estimasi Takaran:</span>
                        <span className="text-[11px] font-black text-emerald-800">
                          {customProportionText}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Price Banner & 1% Customer Loyalty Points */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                {isVariantMissing ? (
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2.5 flex-wrap">
                      <span className="text-2xl sm:text-3xl font-black text-slate-800">
                        {minVariantPrice === maxVariantPrice
                          ? formatRupiah(minVariantPrice)
                          : `${formatRupiah(minVariantPrice)} - ${formatRupiah(maxVariantPrice)}`}
                      </span>
                      <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                        Pilih Varian di Atas 👆
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Harga & Koin Pawon akan dikalikan otomatis sesuai varian dan jumlah beli.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-2xl sm:text-3xl font-black text-emerald-700">
                        {formatRupiah(totalPrice)}
                      </span>
                      {orderQuantity > 1 && (
                        <span className="text-xs sm:text-sm font-bold text-slate-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                          {orderQuantity}x @ {formatRupiah(unitPrice)}
                        </span>
                      )}
                      {hasDiscount && (
                        <span className="text-sm sm:text-base text-slate-400 line-through">
                          {formatRupiah(product.price * orderQuantity)}
                        </span>
                      )}
                      <span className="text-xs text-slate-500 font-medium">
                        /{selectedVariant ? selectedVariant.name : product.unit}
                      </span>
                    </div>
                  </div>
                )}

                {/* Customer Points Reward Callout */}
                <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100/70 border border-amber-300/80 rounded-2xl p-3 text-xs space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-black text-amber-950">
                      <span className="text-base animate-pulse">🪙</span>
                      <span>
                        {isVariantMissing
                          ? 'Dapatkan Koin Pawon setelah memilih varian'
                          : `Dapatkan +${activePoints} Koin Pawon`}
                      </span>
                    </span>
                    <span className="font-black text-amber-900 bg-amber-200/90 border border-amber-300 px-2 py-0.5 rounded-lg text-xs">
                      Tukar Sembako
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900/80 leading-relaxed">
                    Koin otomatis masuk ke akun Anda untuk pesanan ini. Kumpulkan dan tukarkan dengan Beras, Minyak, Telur, atau Sayur Sop Gratis kapan saja!
                  </p>
                </div>
              </div>

              {/* Desktop Quantity & Action Buttons */}
              <div className="hidden md:flex items-center gap-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 bg-slate-100 rounded-2xl p-1.5 border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setOrderQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-xl bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center font-bold text-sm shadow-2xs transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-black text-sm text-slate-900">
                    {orderQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOrderQuantity((q) => Math.min(maxAllowedQty, q + 1))}
                    disabled={orderQuantity >= maxAllowedQty}
                    className="w-8 h-8 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center font-bold text-sm shadow-2xs transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <motion.button
                  whileTap={!isVariantMissing ? { scale: 0.95 } : undefined}
                  disabled={isVariantMissing}
                  onClick={() => {
                    if (isVariantMissing) {
                      handleVariantMissingAlert();
                      return;
                    }
                    const variantToPass: ProductVariant | undefined = isCustomBudgetMode
                      ? {
                          id: `budget_${customBudgetAmount}`,
                          name: `Porsi Budget Rp ${customBudgetAmount.toLocaleString('id-ID')} (${customProportionText})`,
                          price: customBudgetAmount,
                          cost_price: Math.round(activeCost),
                        }
                      : (selectedVariant || undefined);

                    if (!currentUser) {
                      onRequireAuth?.(() => {
                        onAddToCart(product, orderQuantity, variantToPass);
                        triggerToast(`${orderQuantity}x ${product.name} ${variantToPass ? `(${variantToPass.name})` : ''} dimasukkan ke keranjang!`);
                      });
                      return;
                    }
                    onAddToCart(product, orderQuantity, variantToPass);
                    triggerToast(`${orderQuantity}x ${product.name} ${variantToPass ? `(${variantToPass.name})` : ''} dimasukkan ke keranjang!`);
                  }}
                  className={`flex-1 border font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all text-sm ${
                    isVariantMissing
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                      : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800 cursor-pointer'
                  }`}
                  title={isVariantMissing ? 'Pilih varian berat terlebih dahulu' : 'Masukkan ke keranjang'}
                >
                  <ShoppingCart className="w-4 h-4" />
                  {isVariantMissing ? 'Pilih Varian Dulu' : '+ Masukkan Keranjang'}
                </motion.button>

                <motion.button
                  whileTap={!isVariantMissing ? { scale: 0.95 } : undefined}
                  disabled={isVariantMissing}
                  onClick={() => {
                    if (isVariantMissing) {
                      handleVariantMissingAlert();
                      return;
                    }
                    const variantToPass: ProductVariant | undefined = isCustomBudgetMode
                      ? {
                          id: `budget_${customBudgetAmount}`,
                          name: `Porsi Budget Rp ${customBudgetAmount.toLocaleString('id-ID')} (${customProportionText})`,
                          price: customBudgetAmount,
                          cost_price: Math.round(activeCost),
                        }
                      : (selectedVariant || undefined);

                    if (!currentUser) {
                      onRequireAuth?.(() => onBuyNow(product, orderQuantity, variantToPass));
                      return;
                    }
                    onBuyNow(product, orderQuantity, variantToPass);
                  }}
                  className={`flex-1 font-extrabold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all text-sm ${
                    isVariantMissing
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60 shadow-none'
                      : product.stock > 0
                        ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/25 cursor-pointer'
                        : 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 cursor-pointer'
                  }`}
                  title={isVariantMissing ? 'Pilih varian berat terlebih dahulu' : 'Beli sekarang'}
                >
                  {isVariantMissing
                    ? 'Pilih Varian Dulu'
                    : `Beli Sekarang (${formatRupiah(totalPrice)})`}
                </motion.button>
              </div>
            </div>

            {/* Pre-Order Cycle Timeline Widget */}
            <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Alur Panen PO H-1
                </span>
                <span className="text-[11px] bg-white/20 text-white px-2.5 py-0.5 rounded-full font-bold">
                  Batas PO: 21:00 WIB
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-2 text-center">
                <div className="space-y-1">
                  <div className="w-7 h-7 mx-auto rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center text-xs font-black">
                    1
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold block text-emerald-100">21:00 Hari Ini</span>
                  <span className="text-[9px] text-emerald-300/80 block leading-tight">Cut-Off Pesan</span>
                </div>
                <div className="space-y-1">
                  <div className="w-7 h-7 mx-auto rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center text-xs font-black">
                    2
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold block text-emerald-100">03:00 Subuh</span>
                  <span className="text-[9px] text-emerald-300/80 block leading-tight">Petani Petik</span>
                </div>
                <div className="space-y-1">
                  <div className="w-7 h-7 mx-auto rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center text-xs font-black">
                    3
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold block text-emerald-100">05:00 Pagi</span>
                  <span className="text-[9px] text-emerald-300/80 block leading-tight">QC & Rantai Dingin</span>
                </div>
                <div className="space-y-1">
                  <div className="w-7 h-7 mx-auto rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center text-xs font-black">
                    4
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold block text-emerald-100">06:00-08:00</span>
                  <span className="text-[9px] text-emerald-300/80 block leading-tight">Tiba di Rumah</span>
                </div>
              </div>
            </div>

            {/* Description & Cooking / Storage Guide */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-2xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-600" />
                Deskripsi & Keunggulan Sayur
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {product.description}
              </p>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-2xl space-y-1.5 text-xs text-amber-900">
                <div className="font-extrabold flex items-center gap-1.5 text-amber-800">
                  <Info className="w-4 h-4 text-amber-600" />
                  Tips Penyimpanan & Kesegaran:
                </div>
                <p className="text-[11px] text-amber-800/90 leading-normal">
                  Jangan dicuci sebelum disimpan ke lemari es. Simpan di laci sayur (*crisper drawer*) bersuhu 5-10°C dengan bungkus kertas berpori agar daun tetap renyah hingga 5-7 hari.
                </p>
              </div>
            </div>

            {/* Testimonials & Reviews Section */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    Ulasan & Testimoni Pembeli
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Pengalaman nyata dari pembeli PO Panen Subuh JogoPawon
                  </p>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (!currentUser) {
                      onRequireAuth?.(() => setIsWriteReviewOpen(true));
                      return;
                    }
                    setIsWriteReviewOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tulis Ulasan
                </motion.button>
              </div>

              {/* Rating Overview Box */}
              <div className="bg-slate-50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-200/60">
                <div className="flex items-center gap-3 text-center sm:text-left">
                  <div className="text-3xl font-black text-slate-900">
                    {product.rating.toFixed(1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(product.rating) ? 'fill-amber-400' : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Berdasarkan {reviews.length} ulasan pembeli terverifikasi
                    </span>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold">
                  <button
                    onClick={() => setSelectedFilter('all')}
                    className={`px-3 py-1 rounded-xl transition-colors ${
                      selectedFilter === 'all'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Semua ({reviews.length})
                  </button>
                  <button
                    onClick={() => setSelectedFilter('5star')}
                    className={`px-3 py-1 rounded-xl transition-colors ${
                      selectedFilter === '5star'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Bintang 5 ({reviews.filter((r) => r.rating === 5).length})
                  </button>
                  <button
                    onClick={() => setSelectedFilter('photo')}
                    className={`px-3 py-1 rounded-xl transition-colors ${
                      selectedFilter === 'photo'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Dengan Foto ({reviews.filter((r) => r.images && r.images.length > 0).length})
                  </button>
                </div>
              </div>

              {/* Reviews List */}
              {loadingReviews ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Memuat testimoni sayur...
                </div>
              ) : filteredReviews.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Belum ada ulasan untuk filter ini. Jadilah yang pertama memberikan testimoni!
                </div>
              ) : (
                <div className="space-y-3.5 divide-y divide-slate-100">
                  {filteredReviews.map((rev) => {
                    const isLiked = !!likedReviews[rev.id];
                    const displayLikes = rev.likes + (isLiked ? 1 : 0);

                    return (
                      <div key={rev.id} className="pt-3.5 first:pt-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-black text-xs flex items-center justify-center uppercase shadow-2xs">
                              {rev.user_name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-900">
                                  {rev.user_name}
                                </span>
                                {rev.verified_buyer && (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5" /> Pembeli Terverifikasi
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {rev.location} • {rev.date}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5 text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < rev.rating ? 'fill-amber-400' : 'text-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-normal">
                          {rev.comment}
                        </p>

                        {/* Customer Photos if any */}
                        {rev.images && rev.images.length > 0 && (
                          <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                            {rev.images.map((imgUrl, idx) => (
                              <img
                                key={idx}
                                src={imgUrl}
                                alt="Foto Pembeli"
                                className="w-16 h-16 object-cover rounded-xl border border-slate-200"
                              />
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                          <span className="text-[10px] text-emerald-600 font-semibold">
                            Variasi: Panen Subuh Besok
                          </span>
                          <button
                            onClick={() => handleLikeReview(rev.id)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg transition-colors ${
                              isLiked
                                ? 'text-emerald-700 font-bold bg-emerald-50'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                            Membantu ({displayLikes})
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recommended Related Vegetables */}
            {relatedProducts.length > 0 && (
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-2xs space-y-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center justify-between">
                  <span>Sayuran Pelengkap (Sering Dibeli Bersama)</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {relatedProducts.map((relProd) => (
                    <motion.div
                      key={relProd.id}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => onSelectProduct(relProd)}
                      className="cursor-pointer bg-slate-50 hover:bg-slate-100 rounded-2xl p-2.5 border border-slate-200/70 transition-all flex flex-col justify-between"
                    >
                      <div className="aspect-square rounded-xl overflow-hidden mb-2 bg-slate-200">
                        <img
                          src={relProd.image_url}
                          alt={relProd.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-800 line-clamp-1">
                          {relProd.name}
                        </h4>
                        <div className="text-xs font-black text-emerald-700 mt-0.5">
                          {formatRupiah(relProd.discount_price || relProd.price)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Write Review Modal */}
      <AnimatePresence>
        {isWriteReviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 relative space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Tulis Testimoni Sayur
                  </h3>
                  <p className="text-xs text-slate-500">
                    {product.name}
                  </p>
                </div>
                <button
                  onClick={() => setIsWriteReviewOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddReviewSubmit} className="space-y-3.5 text-xs">
                {/* Rating Stars Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kepuasan Kesegaran:
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setReviewerRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= reviewerRating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-200'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-amber-600 ml-2">
                      {reviewerRating === 5
                        ? '⭐⭐⭐⭐⭐ Luar Biasa Segar!'
                        : reviewerRating === 4
                        ? '⭐⭐⭐⭐ Sangat Segar'
                        : '⭐⭐⭐ Cukup'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Anda / Inisial:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Anda / Inisial"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-emerald-600 text-xs bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Lokasi / Daerah:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Lembang / Jakarta Selatan"
                    value={reviewerLocation}
                    onChange={(e) => setReviewerLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-emerald-600 text-xs bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Pengalaman Kesegaran & Masakan:
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Ceritakan kondisi sayur saat sampai, embun pagi, kerenyahan saat dimasak..."
                    value={reviewerComment}
                    onChange={(e) => setReviewerComment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-emerald-600 text-xs bg-slate-50 resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWriteReviewOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submittingReview ? 'Menerbitkan...' : 'Terbitkan Testimoni'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Shopee-style Mobile Floating Action Bar at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-2.5 md:hidden shadow-lg">
        {/* If variant missing, show warning banner above bottom buttons */}
        {isVariantMissing && (
          <div
            onClick={handleVariantMissingAlert}
            className="max-w-md mx-auto mb-2 py-1 px-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px] font-bold flex items-center justify-between cursor-pointer active:bg-amber-100"
          >
            <span className="flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Wajib pilih varian berat timbangan</span>
            </span>
            <span className="text-[10px] text-amber-700 font-extrabold underline">
              Pilih Varian 👆
            </span>
          </div>
        )}

        <div className="max-w-md mx-auto flex items-center gap-2.5">
          {/* Stepper (Bagian Hijau) */}
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setOrderQuantity((q) => Math.max(1, q - 1))}
              className="w-7 h-7 rounded-lg bg-white text-slate-700 flex items-center justify-center font-bold text-xs shadow-2xs active:scale-95 transition-transform"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-6 text-center font-black text-xs text-slate-900">
              {orderQuantity}
            </span>
            <button
              type="button"
              onClick={() => setOrderQuantity((q) => Math.min(maxAllowedQty, q + 1))}
              disabled={orderQuantity >= maxAllowedQty}
              className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs active:scale-95 transition-transform disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <motion.button
            whileTap={!isVariantMissing ? { scale: 0.94 } : undefined}
            disabled={isVariantMissing}
            onClick={() => {
              if (isVariantMissing) {
                handleVariantMissingAlert();
                return;
              }
              const variantToPass: ProductVariant | undefined = isCustomBudgetMode
                ? {
                    id: `budget_${customBudgetAmount}`,
                    name: `Porsi Budget Rp ${customBudgetAmount.toLocaleString('id-ID')} (${customProportionText})`,
                    price: customBudgetAmount,
                    cost_price: Math.round(activeCost),
                  }
                : (selectedVariant || undefined);

              if (!currentUser) {
                onRequireAuth?.(() => {
                  onAddToCart(product, orderQuantity, variantToPass);
                  triggerToast(`${orderQuantity}x ${product.name} ${variantToPass ? `(${variantToPass.name})` : ''} dimasukkan ke keranjang!`);
                });
                return;
              }
              onAddToCart(product, orderQuantity, variantToPass);
              triggerToast(`${orderQuantity}x ${product.name} ${variantToPass ? `(${variantToPass.name})` : ''} dimasukkan ke keranjang!`);
            }}
            className={`flex-1 border font-bold py-2.5 px-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-all ${
              isVariantMissing
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300 cursor-pointer active:bg-emerald-100'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{isVariantMissing ? 'Pilih Varian' : '+ Keranjang'}</span>
          </motion.button>

          <motion.button
            whileTap={!isVariantMissing ? { scale: 0.94 } : undefined}
            disabled={isVariantMissing}
            onClick={() => {
              if (isVariantMissing) {
                handleVariantMissingAlert();
                return;
              }
              const variantToPass: ProductVariant | undefined = isCustomBudgetMode
                ? {
                    id: `budget_${customBudgetAmount}`,
                    name: `Porsi Budget Rp ${customBudgetAmount.toLocaleString('id-ID')} (${customProportionText})`,
                    price: customBudgetAmount,
                    cost_price: Math.round(activeCost),
                  }
                : (selectedVariant || undefined);

              if (!currentUser) {
                onRequireAuth?.(() => onBuyNow(product, orderQuantity, variantToPass));
                return;
              }
              onBuyNow(product, orderQuantity, variantToPass);
            }}
            className={`flex-1 font-extrabold py-2.5 px-2 rounded-xl text-xs flex items-center justify-center shadow-md transition-all ${
              isVariantMissing
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50 shadow-none'
                : 'bg-emerald-600 active:bg-emerald-700 text-white shadow-emerald-600/30 cursor-pointer'
            }`}
          >
            <span className="truncate">
              {isVariantMissing
                ? 'Pilih Varian Dulu'
                : `Beli (${formatRupiah(totalPrice)})`}
            </span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};
