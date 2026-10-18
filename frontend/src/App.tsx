import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Banner } from './components/Banner';
import { ProductCard } from './components/ProductCard';
import { CartModal } from './components/CartModal';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { AdminDashboard } from './components/AdminDashboard';
import { MobileCartBar } from './components/MobileCartBar';
import { ProductDetail } from './components/ProductDetail';
import { AuthModal } from './components/AuthModal';
import { AuthPage } from './components/AuthPage';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { OrderHistoryModal } from './components/OrderHistoryModal';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { RewardStoreModal } from './components/RewardStoreModal';
import { UserProfileModal } from './components/UserProfileModal';
import { ProfilePage } from './components/ProfilePage';
import { HomePage } from './components/HomePage';
import { RewardsPage } from './components/RewardsPage';
import { CartPage } from './components/CartPage';
import { MainNavTab, BottomNav } from './components/BottomNav';
import { Product, Category, DeliverySlot, Order, AdminStats, OrderStatus, User, CartItem, ProductVariant } from './types';
import { api, realtime } from './services/api';
import { promptInstallApp } from './utils/pwa';
import { Leaf, Carrot, Apple, Flame, Soup, Layers, Sparkles, Search, X } from 'lucide-react';
import { motion } from 'framer-motion';

export const App: React.FC = () => {
  // ROUTE CHECK: Admin is strictly hidden unless secret URL is explicitly typed (/kelola-dapur or #/kelola-dapur)
  const checkIsAdminRoute = () => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return (
      path === '/kelola-dapur' ||
      path.startsWith('/kelola-dapur/') ||
      hash === '#/kelola-dapur' ||
      hash.startsWith('#/kelola-dapur')
    );
  };

  const getProductIdFromUrl = () => {
    const hash = window.location.hash;
    if (hash.startsWith('#/product/')) {
      return hash.replace('#/product/', '');
    }
    const path = window.location.pathname;
    if (path.startsWith('/product/')) {
      return path.replace('/product/', '');
    }
    return null;
  };

  const [isAdmin, setIsAdmin] = useState<boolean>(checkIsAdminRoute);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(getProductIdFromUrl);

  // Customer Authentication state (Shared links remain open, but purchasing requires login)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved =
        localStorage.getItem('jogopawon_customer_user') ||
        localStorage.getItem('sayurgo_customer_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [currentView, setCurrentView] = useState<'store' | 'auth' | 'profile'>('store');
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [pendingAuthAction, setPendingAuthAction] = useState<(() => void) | null>(null);
  const [authPromptMessage, setAuthPromptMessage] = useState<string | undefined>(undefined);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);

  const handleTriggerInstall = async () => {
    const result = await promptInstallApp();
    if (result === 'manual_ios' || result === 'unsupported') {
      setIsPwaModalOpen(true);
    }
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login', message?: string) => {
    setAuthInitialMode(mode);
    setAuthPromptMessage(message);
    setCurrentView('auth');
    try {
      window.history.pushState(null, '', mode === 'register' ? '#register' : '#login');
    } catch {}
  };

  const handleOpenProfile = () => {
    if (currentUser) {
      setCurrentView('profile');
      try {
        window.history.pushState(null, '', '#profil');
      } catch {}
    } else {
      handleOpenAuth('login');
    }
  };

  const handleBackToStore = () => {
    setCurrentView('store');
    try {
      if (window.location.hash) {
        window.history.pushState(null, '', window.location.pathname);
      }
    } catch {}
  };

  const triggerRequireAuth = (action?: () => void, message?: string, mode: 'login' | 'register' = 'login') => {
    if (action) {
      setPendingAuthAction(() => action);
    } else {
      setPendingAuthAction(null);
    }
    handleOpenAuth(mode, message);
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('jogopawon_customer_user', JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to save customer to localStorage:', e);
    }
    if (pendingAuthAction) {
      const action = pendingAuthAction;
      setPendingAuthAction(null);
      setTimeout(() => action(), 100);
    }
    handleBackToStore();
  };

  const handleLogout = () => {
    localStorage.removeItem('jogopawon_customer_user');
    localStorage.removeItem('sayurgo_customer_user');
    setCurrentUser(null);
    handleBackToStore();
  };

  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);

  const handlePointsUpdated = (newPoints: number) => {
    if (currentUser) {
      const updated = { ...currentUser, points: newPoints };
      setCurrentUser(updated);
      try {
        localStorage.setItem('jogopawon_customer_user', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to update customer points in localStorage:', e);
      }
    }
  };

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTrackingOrder, setActiveTrackingOrderState] = useState<Order | null>(() => {
    try {
      const saved = localStorage.getItem('jogopawon_active_tracking_order');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved active order:', e);
    }
    return null;
  });
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);

  const setActiveTrackingOrder = (order: Order | null | ((prev: Order | null) => Order | null)) => {
    setActiveTrackingOrderState((prev) => {
      const next = typeof order === 'function' ? order(prev) : order;
      try {
        if (next) {
          localStorage.setItem('jogopawon_active_tracking_order', JSON.stringify(next));
        } else {
          localStorage.removeItem('jogopawon_active_tracking_order');
        }
      } catch (e) {
        console.warn('Failed to sync active order to localStorage:', e);
      }
      return next;
    });
  };

  const [justCompletedOrder, setJustCompletedOrder] = useState<Order | null>(null);
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);
  const [isOrderHistoryModalOpen, setIsOrderHistoryModalOpen] = useState(false);
  const [mainTab, setMainTab] = useState<MainNavTab>('home');

  // Catat riwayat order lokal agar selalu bisa dilihat di HP/browser customer
  const recordCustomerOrder = (order: Order) => {
    try {
      const stored = localStorage.getItem('jogopawon_customer_orders');
      let list: string[] = stored ? JSON.parse(stored) : [];
      if (!list.includes(order.order_number)) {
        list.unshift(order.order_number);
        localStorage.setItem('jogopawon_customer_orders', JSON.stringify(list.slice(0, 50)));
      }
      // Simpan juga sebagai pesanan aktif yang sedang berlangsung
      localStorage.setItem('jogopawon_active_tracking_order', JSON.stringify(order));
    } catch (e) {
      console.warn('Gagal mencatat order customer:', e);
    }
  };

  // Re-order (Pesan Lagi) items from past order
  const handleReorder = (order: Order) => {
    setCart((prevCart) => {
      let newCart = [...prevCart];
      (order.items || []).forEach((orderItem) => {
        const matchingProduct: Product = products.find((p) => p.id === orderItem.product_id) || {
          id: orderItem.product_id,
          name: orderItem.product_name,
          category_id: 'sayur-mayur',
          price: orderItem.price,
          cost_price: orderItem.cost_price || orderItem.price * 0.8,
          unit: orderItem.unit || 'porsi',
          stock: 99,
          freshness: 'Segar Baru Panen',
          origin: 'Pasuruan',
          description: orderItem.product_name,
          image_url: orderItem.product_image || '/logo.webp',
          rating: 5,
          sold_count: 0,
          is_flash_sale: false,
          is_popular: false,
          po_batch: 'Panen Subuh Besok',
        };

        const existingIdx = newCart.findIndex(
          (ci) => ci.product.id === orderItem.product_id && ci.selectedVariant?.name === orderItem.variant_name
        );

        if (existingIdx > -1) {
          newCart[existingIdx] = {
            ...newCart[existingIdx],
            quantity: newCart[existingIdx].quantity + (orderItem.quantity || 1),
          };
        } else {
          newCart.push({
            product: matchingProduct,
            quantity: orderItem.quantity || 1,
            selectedVariant: orderItem.variant_name
              ? {
                  id: (orderItem as any).variant_id || 'var-' + orderItem.product_id,
                  name: orderItem.variant_name,
                  price: orderItem.price,
                  cost_price: orderItem.cost_price || orderItem.price * 0.8,
                }
              : undefined,
          });
        }
      });
      return newCart;
    });

    setIsOrderHistoryModalOpen(false);
    setActiveTrackingOrder(null);
    navigateToTab('cart');
  };

  // Ref for smooth scroll to categories
  const categorySectionRef = useRef<HTMLDivElement>(null);

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliverySlots, setDeliverySlots] = useState<DeliverySlot[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSort, setActiveSort] = useState<'all' | 'popular' | 'cheap' | 'flash' | 'rating'>('all');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Initial tab untuk ProfilePage (misal langsung buka tab 'address_house' saat diarahkan dari keranjang)
  const [profileInitialTab, setProfileInitialTab] = useState<'orders' | 'profile' | 'address_house' | 'security' | 'coins'>('orders');

  const handleGoToProfileAddress = () => {
    setProfileInitialTab('address_house');
    if (currentUser) {
      setCurrentView('profile');
      setMainTab('profile');
      try { window.history.pushState(null, '', '#alamat'); } catch {}
    } else {
      handleOpenAuth('login', 'Silakan masuk untuk melengkapi alamat pengantaran');
    }
  };

  // Tab Navigation Helper - Berpindah halaman penuh secara mulus
  const navigateToTab = (tab: MainNavTab) => {
    setMainTab(tab);
    if (tab === 'home') {
      setCurrentView('store');
      try { window.history.pushState(null, '', window.location.pathname); } catch {}
    } else if (tab === 'catalog') {
      setCurrentView('store');
      try { window.history.pushState(null, '', '#katalog'); } catch {}
    } else if (tab === 'coins') {
      setCurrentView('store');
      try { window.history.pushState(null, '', '#koin'); } catch {}
    } else if (tab === 'cart') {
      setCurrentView('store');
      try { window.history.pushState(null, '', '#keranjang'); } catch {}
    } else if (tab === 'profile') {
      setProfileInitialTab('orders');
      if (currentUser) {
        setCurrentView('profile');
        try { window.history.pushState(null, '', '#profil'); } catch {}
      } else {
        handleOpenAuth('login', 'Silakan masuk untuk melihat profil akun Anda');
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Listen to browser navigation changes
  useEffect(() => {
    const onLocationChange = () => {
      setIsAdmin(checkIsAdminRoute());
      setSelectedProductId(getProductIdFromUrl());

      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (hash === '#login' || hash === '#/login' || path === '/login') {
        setAuthInitialMode('login');
        setCurrentView('auth');
      } else if (hash === '#register' || hash === '#/register' || path === '/register') {
        setAuthInitialMode('register');
        setCurrentView('auth');
      } else if (hash === '#alamat' || hash === '#/alamat') {
        setProfileInitialTab('address_house');
        const saved =
          localStorage.getItem('jogopawon_customer_user') ||
          localStorage.getItem('sayurgo_customer_user');
        if (saved || currentUser) {
          setCurrentView('profile');
          setMainTab('profile');
        } else {
          setAuthInitialMode('login');
          setAuthPromptMessage('Silakan masuk untuk melengkapi alamat pengantaran');
          setCurrentView('auth');
        }
      } else if (hash === '#akun' || hash === '#/akun' || hash === '#profil' || hash === '#/profil' || path === '/akun' || path === '/profil') {
        setProfileInitialTab('orders');
        const saved =
          localStorage.getItem('jogopawon_customer_user') ||
          localStorage.getItem('sayurgo_customer_user');
        if (saved || currentUser) {
          setCurrentView('profile');
          setMainTab('profile');
        } else {
          setAuthInitialMode('login');
          setCurrentView('auth');
        }
      } else if (hash === '#katalog' || hash === '#/katalog' || hash === '#catalog' || hash === '#/catalog' || path === '/katalog') {
        setCurrentView('store');
        setMainTab('catalog');
      } else if (hash === '#koin' || hash === '#/koin' || hash === '#coins' || hash === '#/coins' || hash === '#hadiah') {
        setCurrentView('store');
        setMainTab('coins');
      } else if (hash === '#keranjang' || hash === '#/keranjang' || hash === '#cart' || hash === '#/cart') {
        setCurrentView('store');
        setMainTab('cart');
      } else if (hash === '#beranda' || hash === '#/beranda' || hash === '#home' || hash === '#/home') {
        setCurrentView('store');
        setMainTab('home');
      } else if (!hash && (path === '/' || path === '')) {
        setCurrentView('store');
        setMainTab('home');
      }
    };

    onLocationChange();

    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('hashchange', onLocationChange);

    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('hashchange', onLocationChange);
    };
  }, []);

  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      // AudioContext could be blocked by browser autoplay policy
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, prods, slots, ords, stats] = await Promise.all([
        api.getCategories().catch(() => []),
        api.getProducts().catch(() => []),
        api.getDeliverySlots().catch(() => []),
        api.getAdminOrders().catch(() => []),
        api.getAdminStats().catch(() => null),
      ]);

      if (cats.length > 0) setCategories(cats);
      if (prods.length > 0) setProducts(prods);
      if (slots.length > 0) setDeliverySlots(slots);
      if (ords.length > 0) {
        setOrders(ords);
        setActiveTrackingOrder((current) => {
          if (!current) {
            // Cek apakah ada riwayat order customer di local storage
            try {
              const stored = localStorage.getItem('jogopawon_customer_orders');
              if (stored) {
                const list: string[] = JSON.parse(stored);
                if (list.length > 0) {
                  const latestMatch = ords.find((o: Order) => o.order_number === list[0] || o.id === list[0]);
                  if (latestMatch) return latestMatch;
                }
              }
            } catch {}
            return current;
          }
          const matched = ords.find((o: Order) => o.id === current.id || o.order_number === current.order_number);
          return matched || current;
        });
      }
      if (stats) setAdminStats(stats);
    } catch (err) {
      console.warn('Backend server connecting or in offline mode:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribe = realtime.subscribe((msg) => {
      if (msg.event === 'NEW_ORDER') {
        const incomingOrder = msg.payload as Order;
        setOrders((prev) => [incomingOrder, ...prev]);
        setNewOrderAlert(incomingOrder);
        playAlertSound();
        api.getAdminStats().then(setAdminStats).catch(() => {});
      } else if (msg.event === 'ORDER_STATUS_UPDATED') {
        const updated = msg.payload as Order;
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));

        setActiveTrackingOrder((current) => {
          if (current && (current.id === updated.id || current.order_number === updated.order_number)) {
            return updated;
          }
          return current;
        });

        api.getAdminStats().then(setAdminStats).catch(() => {});
      } else if (msg.event === 'PRODUCT_UPDATED') {
        const updatedProd = msg.payload as Product;
        setProducts((prev) => {
          const exists = prev.some((p) => p.id === updatedProd.id);
          if (exists) {
            return prev.map((p) => (p.id === updatedProd.id ? updatedProd : p));
          }
          return [updatedProd, ...prev];
        });
      } else if (msg.event === 'PRODUCT_DELETED') {
        const deletedId = typeof msg.payload === 'string' ? msg.payload : (msg.payload as any)?.id;
        if (deletedId) {
          setProducts((prev) => prev.filter((p) => p.id !== deletedId));
          setCart((prev) => prev.filter((item) => item.product.id !== deletedId));
        }
      } else if (msg.event === 'ORDER_DELETED') {
        const deleted = msg.payload as { id?: string; order_number?: string };
        const delId = typeof msg.payload === 'string' ? msg.payload : deleted?.id;
        const delNum = deleted?.order_number;
        setOrders((prev) => prev.filter((o) => o.id !== delId && o.order_number !== delId && o.order_number !== delNum));
        setActiveTrackingOrder((current) => {
          if (current && (current.id === delId || current.order_number === delId || current.order_number === delNum)) {
            return null;
          }
          return current;
        });
        api.getAdminStats().then(setAdminStats).catch(() => {});
      } else if (msg.event === 'NEW_REWARD_REDEMPTION') {
        playAlertSound();
      } else if (msg.event === 'PUSH_NOTIFICATION_BROADCAST') {
        // Notifikasi siaran broadcast dari admin
        const payload = msg.payload as { title: string; body: string; url?: string; image?: string };
        if (payload && payload.title) {
          playAlertSound();
          import('./utils/pwa').then(({ displayLocalPushNotification }) => {
            displayLocalPushNotification(payload.title, {
              body: payload.body,
              icon: '/logo.png',
              data: { url: payload.url || '/' },
            });
          }).catch(() => {});
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleAddToCart = (product: Product, quantity: number = 1, variant?: ProductVariant) => {
    setCart((prev) => {
      const isMatch = (item: CartItem) => {
        if (variant) {
          return item.product.id === product.id && item.selectedVariant?.id === variant.id;
        }
        return item.product.id === product.id && !item.selectedVariant;
      };
      const existing = prev.find(isMatch);
      if (existing) {
        return prev.map((item) =>
          isMatch(item) ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { product, quantity, selectedVariant: variant }];
    });
  };

  const handleUpdateCartQuantity = (productId: string, delta: number, variantId?: string) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          const isMatch = item.product.id === productId && (variantId ? item.selectedVariant?.id === variantId : !item.selectedVariant);
          if (isMatch) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveCartItem = (productId: string, variantId?: string) => {
    setCart((prev) => prev.filter((item) => {
      if (variantId) {
        return !(item.product.id === productId && item.selectedVariant?.id === variantId);
      }
      return item.product.id !== productId;
    }));
  };

  const handleClearCart = () => setCart([]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(product.id);
    window.location.hash = `#/product/${product.id}`;
  };

  const handleBackFromDetail = () => {
    setSelectedProductId(null);
    if (window.location.hash.startsWith('#/product/')) {
      window.location.hash = '';
    }
  };

  const handleAddToCartWithQty = (product: Product, quantity: number = 1, variant?: ProductVariant) => {
    handleAddToCart(product, quantity, variant);
  };

  const handleBuyNow = (product: Product, quantity: number = 1, variant?: ProductVariant) => {
    handleAddToCart(product, quantity, variant);
    handleBackFromDetail();
    navigateToTab('cart');
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const totalCartAmount = cart.reduce((sum, item) => {
    const price = item.selectedVariant ? item.selectedVariant.price : (item.product.discount_price || item.product.price);
    return sum + price * item.quantity;
  }, 0);

  const scrollToCategories = () => {
    categorySectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus, courier?: string, paymentStatus?: string) => {
    try {
      const updated = await api.updateOrderStatus(orderId, status, courier, paymentStatus);
      if (updated) {
        setOrders((prev) => prev.map((o) => (o.id === updated.id || o.order_number === updated.order_number ? updated : o)));
        setActiveTrackingOrder((current) => {
          if (current && (current.id === updated.id || current.order_number === updated.order_number)) {
            return updated;
          }
          return current;
        });
      }
    } catch (err) {
      console.error('Gagal update status pesanan:', err);
      throw err;
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await api.deleteOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId && o.order_number !== orderId));
      setActiveTrackingOrder((current) => {
        if (current && (current.id === orderId || current.order_number === orderId)) {
          return null;
        }
        return current;
      });
    } catch (err) {
      console.error('Gagal menghapus pesanan:', err);
      throw err;
    }
  };

  const handleUpdateProduct = async (product: Product) => {
    await api.updateProduct(product);
    setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
  };

  const handleAddNewProduct = async (productData: Omit<Product, 'id' | 'rating' | 'sold_count'>) => {
    const created = await api.addProduct(productData);
    setProducts((prev) => [created, ...prev]);
  };

  const handleDeleteProduct = async (productId: string) => {
    await api.deleteProduct(productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const filteredProducts = products
    .filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category_id === selectedCategory;
      const matchSearch =
        searchQuery === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFlash = activeSort === 'flash' ? p.is_flash_sale : true;
      return matchCat && matchSearch && matchFlash;
    })
    .sort((a, b) => {
      if (activeSort === 'popular') return b.sold_count - a.sold_count;
      if (activeSort === 'cheap') {
        const priceA = a.discount_price || a.price;
        const priceB = b.discount_price || b.price;
        return priceA - priceB;
      }
      if (activeSort === 'rating') return b.rating - a.rating;
      return 0;
    });


  const getCategoryIcon = (iconName: string, catName?: string, catSlug?: string) => {
    const text = ((catName || '') + ' ' + (catSlug || '') + ' ' + iconName).toLowerCase();
    if (text.includes('beras') || text.includes('sembako') || text.includes('minyak') || text.includes('telur')) {
      return <span className="text-sm">🌾</span>;
    }
    if (text.includes('lauk') || text.includes('daging') || text.includes('ayam') || text.includes('ikan') || text.includes('soup')) {
      return <span className="text-sm">🥩</span>;
    }
    if (text.includes('sayur') || text.includes('buah') || text.includes('leaf') || text.includes('carrot') || text.includes('apple')) {
      return <span className="text-sm">🥬</span>;
    }
    if (text.includes('bumbu') || text.includes('rempah') || text.includes('cabai') || text.includes('flame')) {
      return <span className="text-sm">🌶️</span>;
    }
    if (text.includes('rumah') || text.includes('tangga') || text.includes('sabun') || text.includes('sanitasi')) {
      return <span className="text-sm">🧼</span>;
    }
    if (text.includes('minum') || text.includes('snack') || text.includes('kopi') || text.includes('teh')) {
      return <span className="text-sm">☕</span>;
    }
    return <span className="text-sm">🛒</span>;
  };

  // IF ADMIN ROUTE: Render Isolated Master Admin Panel
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
          <AdminDashboard
            orders={orders || []}
            products={products || []}
            categories={categories || []}
            stats={adminStats}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onDeleteOrder={handleDeleteOrder}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onAddNewProduct={handleAddNewProduct}
            onRefreshData={loadData}
            newOrderAlert={newOrderAlert}
            onDismissAlert={() => setNewOrderAlert(null)}
          />
        </main>
      </div>
    );
  }

  // IF AUTH PAGE ROUTE: Render Dedicated Full-Page Login & Register
  if (currentView === 'auth') {
    return (
      <AuthPage
        initialMode={authInitialMode}
        promptMessage={authPromptMessage}
        onBack={handleBackToStore}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  // IF PROFILE PAGE ROUTE: Render Dedicated Full-Page Account Management
  if (currentView === 'profile' && currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-28 md:pb-0 overflow-x-hidden w-full max-w-full">
        <ProfilePage
          currentUser={currentUser}
          initialTab={profileInitialTab}
          onBack={() => navigateToTab('home')}
          onBackToCart={cart.length > 0 ? () => { setCurrentView('store'); navigateToTab('cart'); } : undefined}
          onUserUpdated={(updated) => {
            setCurrentUser(updated);
            try {
              localStorage.setItem('jogopawon_customer_user', JSON.stringify(updated));
            } catch (e) {
              console.warn('Failed to save updated profile:', e);
            }
          }}
          onLogout={() => {
            handleLogout();
            navigateToTab('home');
          }}
          onOpenRewards={() => navigateToTab('coins')}
          onOpenTracking={() => {
            if (orders.length > 0) {
              setActiveTrackingOrder(orders[0]);
              setIsTrackingModalOpen(true);
            } else {
              setIsOrderHistoryModalOpen(true);
            }
          }}
          onTrackOrder={(order) => {
            setActiveTrackingOrder(order);
            setIsTrackingModalOpen(true);
          }}
          onReorder={handleReorder}
        />
        <BottomNav
          activeTab="profile"
          onTabChange={navigateToTab}
          cartCount={totalCartCount}
          hasActiveOrder={!!activeTrackingOrder}
          currentUser={currentUser}
        />

        {/* Live Order Tracking Modal inside Profile View */}
        <OrderTrackingModal
          order={isTrackingModalOpen ? activeTrackingOrder : null}
          onClose={() => setIsTrackingModalOpen(false)}
          onOrderUpdated={(updated) => {
            setActiveTrackingOrder(updated);
            setOrders((prev) => prev.map((o) => (o.id === updated.id || o.order_number === updated.order_number ? updated : o)));
          }}
          onOpenOrderHistory={() => {
            setIsTrackingModalOpen(false);
            setIsOrderHistoryModalOpen(true);
          }}
        />

        {/* Order History Modal */}
        <OrderHistoryModal
          isOpen={isOrderHistoryModalOpen}
          onClose={() => setIsOrderHistoryModalOpen(false)}
          currentUser={currentUser}
          onSelectOrder={(order) => {
            setIsOrderHistoryModalOpen(false);
            setActiveTrackingOrder(order);
          }}
          onReorder={handleReorder}
          onOpenStore={() => {
            setIsOrderHistoryModalOpen(false);
            navigateToTab('catalog');
          }}
        />
      </div>
    );
  }

  // IF PRODUCT DETAIL ROUTE: Dedicated Product Page with Testimonials
  const activeDetailProduct = selectedProductId ? products.find((p) => p.id === selectedProductId) : null;
  if (activeDetailProduct) {
    const cartItem = cart.find((item) => item.product.id === activeDetailProduct.id);
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <ProductDetail
          product={activeDetailProduct}
          allProducts={products}
          quantityInCart={cartItem ? cartItem.quantity : 0}
          onBack={handleBackFromDetail}
          onAddToCart={handleAddToCartWithQty}
          onUpdateQuantity={handleUpdateCartQuantity}
          onBuyNow={handleBuyNow}
          onSelectProduct={handleSelectProduct}
          cartCount={totalCartCount}
          onOpenCart={() => {
            handleBackFromDetail();
            navigateToTab('cart');
          }}
          currentUser={currentUser}
          onRequireAuth={triggerRequireAuth}
        />

        {/* Cart & Checkout Modal with Mobile Bottom Sheet Animation */}
        <CartModal
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cart={cart}
          deliverySlots={deliverySlots}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemoveItem={handleRemoveCartItem}
          onClearCart={handleClearCart}
          onSubmitOrder={api.createOrder}
          onOrderSuccess={(order) => {
            recordCustomerOrder(order);
            setActiveTrackingOrder(order);
            setJustCompletedOrder(order);
            if (currentUser && order.points_earned) {
              const updated = { ...currentUser, points: (currentUser.points || 0) + order.points_earned };
              setCurrentUser(updated);
              try {
                localStorage.setItem('jogopawon_customer_user', JSON.stringify(updated));
              } catch (e) {
                console.warn(e);
              }
            }
            loadData();
          }}
          currentUser={currentUser}
          onRequireAuth={triggerRequireAuth}
          onGoToProfileAddress={handleGoToProfileAddress}
        />

        {/* Live Order Tracking Modal */}
        <OrderTrackingModal
          order={isTrackingModalOpen ? activeTrackingOrder : null}
          onClose={() => setIsTrackingModalOpen(false)}
          onOrderUpdated={(updated) => {
            setActiveTrackingOrder(updated);
            setOrders((prev) => prev.map((o) => (o.id === updated.id || o.order_number === updated.order_number ? updated : o)));
          }}
          onOpenOrderHistory={() => {
            setIsTrackingModalOpen(false);
            setIsOrderHistoryModalOpen(true);
          }}
        />

        {/* Order History Modal */}
        <OrderHistoryModal
          isOpen={isOrderHistoryModalOpen}
          onClose={() => setIsOrderHistoryModalOpen(false)}
          currentUser={currentUser}
          onSelectOrder={(order) => {
            setIsOrderHistoryModalOpen(false);
            setActiveTrackingOrder(order);
            setIsTrackingModalOpen(true);
          }}
          onReorder={handleReorder}
          onOpenStore={() => {
            setIsOrderHistoryModalOpen(false);
            navigateToTab('catalog');
          }}
        />

        {/* Instant WhatsApp Order Confirmation Modal */}
        <OrderSuccessModal
          order={justCompletedOrder}
          onClose={() => setJustCompletedOrder(null)}
          onOpenTracking={(order) => {
            setJustCompletedOrder(null);
            setActiveTrackingOrder(order);
          }}
          adminPhone="6289654190596"
        />



        {/* Loyalty Reward Store Modal */}
        <RewardStoreModal
          isOpen={isRewardModalOpen}
          onClose={() => setIsRewardModalOpen(false)}
          currentUser={currentUser}
          onRequireAuth={(action, message) => triggerRequireAuth(action, message)}
          onPointsUpdated={handlePointsUpdated}
        />
      </div>
    );
  }

  // IF CUSTOMER ROUTE: Standard E-Commerce Storefront with ZERO admin buttons
  const isHeaderVisible = (mainTab === 'home' || mainTab === 'catalog' || searchQuery !== '');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-x-hidden w-full max-w-full">
      {/* Top Header - Pertahankan di Beranda/Dashboard dan Katalog, Sembunyikan di Profile, Keranjang, Koin Pawon */}
      {isHeaderVisible && (
        <Header
          cartCount={totalCartCount}
          onOpenCart={() => navigateToTab('cart')}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            if (q && mainTab !== 'catalog') {
              navigateToTab('catalog');
            }
          }}
          currentUser={currentUser}
          onOpenAuth={() => handleOpenAuth('login')}
          onLogout={handleLogout}
          onOpenInstall={handleTriggerInstall}
          onOpenRewards={() => navigateToTab('coins')}
          onOpenProfile={() => navigateToTab('profile')}
          onOpenOrderHistory={() => setIsOrderHistoryModalOpen(true)}
          currentTab={mainTab}
          onTabChange={navigateToTab}
        />
      )}

      <main className={`flex-1 max-w-7xl w-full mx-auto pb-32 md:pb-12 ${
        mainTab === 'cart' || mainTab === 'coins' ? 'px-0 py-0' : 'px-3 sm:px-4 py-4 sm:py-6'
      }`}>
        <div className={mainTab === 'cart' || mainTab === 'coins' ? 'space-y-0' : 'space-y-4 sm:space-y-6'}>
          {/* Active Customer Order Floating Indicator */}
          {activeTrackingOrder && (
            <div className={mainTab === 'cart' || mainTab === 'coins' ? 'px-3 sm:px-4 pt-3' : ''}>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-900 text-white p-3 sm:p-3.5 rounded-2xl shadow-md flex items-center justify-between gap-3 border border-emerald-700"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <div className="text-xs">
                  <span className="font-bold">Pesanan PO Anda: </span>
                  <span className="font-mono text-emerald-200">{activeTrackingOrder.order_number}</span>
                  <span className="mx-1 text-emerald-400">•</span>
                  <span className="capitalize font-semibold text-emerald-100">
                    {activeTrackingOrder.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsTrackingModalOpen(true)}
                  className="bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  Lacak
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTrackingOrder(null)}
                  title="Tutup banner pesanan ini"
                  className="p-1 rounded-lg text-emerald-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
            </div>
          )}

          {/* TAB 1: HOME (BERANDA PROMO & SHOWCASE HADIAH MEWAH) */}
          {mainTab === 'home' && !searchQuery && (
            <HomePage
              products={products}
              categories={categories}
              cart={cart}
              onAddToCart={handleAddToCart}
              onUpdateQuantity={handleUpdateCartQuantity}
              onSelectProduct={handleSelectProduct}
              onOpenRewards={() => navigateToTab('coins')}
              onGoToCatalog={(catId) => {
                if (catId) setSelectedCategory(catId);
                navigateToTab('catalog');
              }}
              currentUser={currentUser}
              onRequireAuth={triggerRequireAuth}
            />
          )}

          {/* TAB 2: COINS (POJOK KOIN PAWON & PENUKARAN HADIAH) */}
          {mainTab === 'coins' && !searchQuery && (
            <RewardsPage
              currentUser={currentUser}
              onBack={() => navigateToTab('home')}
              onGoToCatalog={() => navigateToTab('catalog')}
              onRequireAuth={triggerRequireAuth}
              onPointsUpdated={handlePointsUpdated}
            />
          )}

          {/* TAB 3: CART (KERANJANG BELANJA & CHECKOUT FULL PAGE) */}
          {mainTab === 'cart' && !searchQuery && (
            <CartPage
              cart={cart}
              deliverySlots={deliverySlots}
              onUpdateQuantity={handleUpdateCartQuantity}
              onRemoveItem={handleRemoveCartItem}
              onClearCart={handleClearCart}
              onSubmitOrder={api.createOrder}
              onOrderSuccess={(order) => {
                recordCustomerOrder(order);
                setActiveTrackingOrder(order);
                setJustCompletedOrder(order);
                handleClearCart();
                if (currentUser && order.points_earned) {
                  const updated = { ...currentUser, points: (currentUser.points || 0) + order.points_earned };
                  setCurrentUser(updated);
                  try {
                    localStorage.setItem('jogopawon_customer_user', JSON.stringify(updated));
                  } catch (e) {
                    console.warn(e);
                  }
                }
                loadData();
              }}
              currentUser={currentUser}
              onRequireAuth={() => handleOpenAuth('login')}
              onBack={() => navigateToTab('home')}
              onGoToCatalog={() => navigateToTab('catalog')}
              onGoToProfileAddress={handleGoToProfileAddress}
              onOpenOrderHistory={() => setIsOrderHistoryModalOpen(true)}
            />
          )}

          {/* TAB 4: CATALOG (KATALOG LENGKAP PRODUK & PENCARIAN) */}
          {(mainTab === 'catalog' || searchQuery !== '') && (
            <>
              {/* Header Banner Katalog Belanja */}
              <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-3xl p-4 sm:p-6 shadow-md border border-emerald-700/60 relative overflow-hidden">
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-emerald-700/80 text-emerald-200 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                        KATALOG RESMI JOGOPAWON
                      </span>
                      <span className="text-xs text-amber-300 font-bold">⭐ Panen Segar & PO</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">
                      Katalog Belanja Sayur & Kebutuhan Dapur
                    </h2>
                    <p className="text-xs sm:text-sm text-emerald-100/85 mt-1 max-w-2xl font-medium">
                      Pilih dari aneka sayur segar petik subuh, sembako murah, daging & bumbu dapur langsung ke keranjang belanja Anda.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      navigateToTab('home');
                    }}
                    className="bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-bold px-3.5 py-2 rounded-2xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <span>🏠</span>
                    <span>Kembali ke Beranda Promo</span>
                  </button>
                </div>
              </div>

              {/* Dedicated Search Bar in Catalog */}
              <div className="relative w-full max-w-2xl mx-auto pt-1">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="🔍 Cari beras, minyak, sayur, telur, daging, bumbu dapur..."
                    className="w-full bg-white text-sm text-slate-800 placeholder-slate-400 rounded-2xl pl-10 pr-24 py-3 border border-emerald-200 shadow-xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                  />
                  <Search className="w-5 h-5 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
                    >
                      ✕ Hapus
                    </button>
                  )}
                </div>
              </div>

          {/* Quick Action Circles / Mobile Category Stories (Shopee/Tokopedia Style) */}
          {/* Quick Action Circles / Mobile Category Stories (Vibrant E-Grocery Aesthetic) */}
          <div className="pt-1 space-y-2">
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2 px-1">
              {/* Story 1: Flash Sale / Super Deal */}
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.88 }}
                onClick={() => {
                  setActiveSort(activeSort === 'flash' ? 'all' : 'flash');
                  scrollToCategories();
                }}
                className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer"
              >
                <div className="relative">
                  <div className={`w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr transition-all shadow-sm ${
                    activeSort === 'flash'
                      ? 'from-amber-500 via-rose-500 to-red-600 ring-2 ring-rose-400 scale-105'
                      : 'from-amber-400 via-rose-500 to-red-500 hover:scale-105'
                  }`}>
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-xl shadow-inner">
                      ⚡
                    </div>
                  </div>
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                    HOT
                  </span>
                </div>
                <span className="text-[10px] font-black text-rose-600 tracking-tight">Super Deal</span>
              </motion.button>

              {/* Story 2: Sembako & Beras */}
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.88 }}
                onClick={() => {
                  const sembakoCat = categories.find((c) => c.slug.includes('sembako') || c.name.toLowerCase().includes('sembako') || c.name.toLowerCase().includes('beras'));
                  if (sembakoCat) setSelectedCategory(sembakoCat.id);
                  scrollToCategories();
                }}
                className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-yellow-500 to-amber-600 hover:scale-105 transition-all shadow-sm">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-xl shadow-inner">
                      🌾
                    </div>
                  </div>
                  <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                    MURAH
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-700 tracking-tight">Sembako</span>
              </motion.button>

              {/* Story 3: Lauk & Daging Segar */}
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.88 }}
                onClick={() => {
                  const laukCat = categories.find((c) => c.slug.includes('lauk') || c.slug.includes('daging') || c.name.toLowerCase().includes('lauk') || c.name.toLowerCase().includes('daging'));
                  if (laukCat) setSelectedCategory(laukCat.id);
                  scrollToCategories();
                }}
                className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-rose-400 via-red-500 to-red-600 hover:scale-105 transition-all shadow-sm">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-xl shadow-inner">
                      🥩
                    </div>
                  </div>
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                    SEGAR
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-700 tracking-tight">Lauk & Daging</span>
              </motion.button>

              {/* Story 4: Sayur & Buah Subuh */}
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.88 }}
                onClick={() => {
                  const sayurCat = categories.find((c) => c.slug.includes('sayur') || c.name.toLowerCase().includes('sayur'));
                  if (sayurCat) setSelectedCategory(sayurCat.id);
                  scrollToCategories();
                }}
                className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-emerald-400 via-green-500 to-teal-600 hover:scale-105 transition-all shadow-sm">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-xl shadow-inner">
                      🥬
                    </div>
                  </div>
                  <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                    PANEN
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-700 tracking-tight">Sayur & Buah</span>
              </motion.button>

              {/* Story 5: Bumbu Pawon */}
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.88 }}
                onClick={() => {
                  const bumbuCat = categories.find((c) => c.slug.includes('bumbu') || c.name.toLowerCase().includes('bumbu'));
                  if (bumbuCat) setSelectedCategory(bumbuCat.id);
                  scrollToCategories();
                }}
                className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-orange-400 via-red-500 to-rose-600 hover:scale-105 transition-all shadow-sm">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-xl shadow-inner">
                      🌶️
                    </div>
                  </div>
                  <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                    LENGKAP
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-700 tracking-tight">Bumbu Pawon</span>
              </motion.button>

              {/* Story 6: Koin Pawon & Hadiah (HIGHLIGHTED) */}
              <motion.button
                whileHover={{ y: -2, scale: 1.05 }}
                whileTap={{ scale: 0.88 }}
                onClick={() => setIsRewardModalOpen(true)}
                className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-300 via-yellow-400 to-amber-500 hover:scale-105 transition-all shadow-md ring-2 ring-amber-300/80">
                    <div className="w-full h-full bg-amber-50 rounded-full flex items-center justify-center text-xl shadow-inner">
                      🪙
                    </div>
                  </div>
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-xs animate-bounce-short">
                    GRATIS
                  </span>
                </div>
                <span className="text-[10px] font-black text-amber-900 tracking-tight">Koin Pawon</span>
              </motion.button>

              {/* Story 7: Kebutuhan Rumah */}
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.88 }}
                onClick={() => {
                  const rumahCat = categories.find((c) => c.slug.includes('rumah') || c.name.toLowerCase().includes('rumah'));
                  if (rumahCat) setSelectedCategory(rumahCat.id);
                  scrollToCategories();
                }}
                className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-cyan-400 via-sky-500 to-blue-600 hover:scale-105 transition-all shadow-sm">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-xl shadow-inner">
                      🧼
                    </div>
                  </div>
                  <span className="absolute -top-1 -right-1 bg-cyan-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                    HEMAT
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-700 tracking-tight">Rumah Tangga</span>
              </motion.button>

              {/* Story 8: Minuman & Camilan */}
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.88 }}
                onClick={() => {
                  const drinkCat = categories.find((c) => c.slug.includes('minum') || c.name.toLowerCase().includes('minuman') || c.name.toLowerCase().includes('camilan'));
                  if (drinkCat) setSelectedCategory(drinkCat.id);
                  scrollToCategories();
                }}
                className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-purple-400 via-violet-500 to-indigo-600 hover:scale-105 transition-all shadow-sm">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-xl shadow-inner">
                      ☕
                    </div>
                  </div>
                  <span className="absolute -top-1 -right-1 bg-violet-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                    ENAK
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-700 tracking-tight">Minuman & Snack</span>
              </motion.button>

              {/* Story 9: Bebas Ongkir */}
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.88 }}
                onClick={() => {
                  alert('🚚 Info Bebas Ongkir JogoPawon:\nBelanja minimal Rp35.000 otomatis mendapatkan potongan gratis ongkir sampai ke rumah Anda!');
                }}
                className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-emerald-500 to-teal-600 hover:scale-105 transition-all shadow-sm">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-xl shadow-inner">
                      🚚
                    </div>
                  </div>
                  <span className="absolute -top-1 -right-1 bg-emerald-700 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                    Rp 0
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-700 tracking-tight">Bebas Ongkir</span>
              </motion.button>
            </div>
          </div>

          {/* Category Filter Pills & Sort Bar */}
          <div ref={categorySectionRef} className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Katalog Toko Online & Kebutuhan Harian
              </h3>
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {filteredProducts.length} Produk
              </span>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl text-[11px] sm:text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/25 scale-102'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80 shadow-2xs'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Semua Barang
              </motion.button>

              {categories.map((cat) => (
                <motion.button
                  key={cat.id}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl text-[11px] sm:text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/25 scale-102'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80 shadow-2xs'
                  }`}
                >
                  {getCategoryIcon(cat.icon, cat.name, cat.slug)}
                  {cat.name}
                </motion.button>
              ))}
            </div>

            {/* Quick Sort Bar (Interactive & Mobile Friendly) */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[10px] sm:text-[11px]">
              <span className="text-slate-400 font-semibold shrink-0">Urutkan:</span>
              <button
                onClick={() => setActiveSort('all')}
                className={`px-2.5 py-1 rounded-xl font-bold shrink-0 transition-all ${
                  activeSort === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Standar
              </button>
              <button
                onClick={() => setActiveSort('popular')}
                className={`px-2.5 py-1 rounded-xl font-bold shrink-0 transition-all flex items-center gap-1 ${
                  activeSort === 'popular'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>🔥 Terlaris</span>
              </button>
              <button
                onClick={() => setActiveSort('cheap')}
                className={`px-2.5 py-1 rounded-xl font-bold shrink-0 transition-all flex items-center gap-1 ${
                  activeSort === 'cheap'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>💰 Termurah</span>
              </button>
              <button
                onClick={() => setActiveSort('rating')}
                className={`px-2.5 py-1 rounded-xl font-bold shrink-0 transition-all flex items-center gap-1 ${
                  activeSort === 'rating'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>⭐ Rating 4.8+</span>
              </button>
              <button
                onClick={() => setActiveSort('flash')}
                className={`px-2.5 py-1 rounded-xl font-bold shrink-0 transition-all flex items-center gap-1 ${
                  activeSort === 'flash'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
                }`}
              >
                <span>⚡ Super Deal</span>
              </button>
            </div>
          </div>

          {/* Product Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                {selectedCategory === 'all'
                  ? 'Semua Produk & Kebutuhan Harian'
                  : categories.find((c) => c.id === selectedCategory)?.name}
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                {filteredProducts.length} produk siap di-order
              </span>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-100">
                <Leaf className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">
                  {searchQuery
                    ? `Tidak ada barang yang cocok dengan pencarian "${searchQuery}"`
                    : 'Belum ada produk barang tersedia.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="mt-3 text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
                {filteredProducts.map((prod) => {
                  const cartItem = cart.find((item) => item.product.id === prod.id);
                  return (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      quantityInCart={cartItem ? cartItem.quantity : 0}
                      onAddToCart={handleAddToCart}
                      onUpdateQuantity={handleUpdateCartQuantity}
                      onSelectProduct={handleSelectProduct}
                      currentUser={currentUser}
                      onRequireAuth={triggerRequireAuth}
                    />
                  );
                })}
              </div>
            )}
          </div>
            </>
          )}
        </div>
      </main>

      {/* Public Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-8 text-xs text-slate-500 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="JogoPawon Logo"
              className="h-8 w-auto object-contain rounded-md"
            />
            <span className="font-bold text-slate-800 text-sm">JogoPawon Mart</span>
            <span className="text-slate-400">— Supermarket & Toko Kebutuhan Harian Online</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-medium text-slate-400">
            <span>© {new Date().getFullYear()} JogoPawon Mart. All Rights Reserved.</span>
          </div>
        </div>
      </footer>

      {/* Shopee-style Floating Mobile Quick Checkout Bar (Hanya tampil jika bukan di tab cart) */}
      {mainTab !== 'cart' && totalCartCount > 0 && (
        <MobileCartBar
          itemCount={totalCartCount}
          totalAmount={totalCartAmount}
          onOpenCart={() => navigateToTab('cart')}
        />
      )}

      {/* Shopee-style Mobile Bottom Navigation Bar (5 Tab Mandiri) */}
      <BottomNav
        activeTab={mainTab}
        onTabChange={navigateToTab}
        cartCount={totalCartCount}
        hasActiveOrder={!!activeTrackingOrder}
        currentUser={currentUser}
      />

      {/* Cart & Checkout Modal with Mobile Bottom Sheet Animation */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        deliverySlots={deliverySlots}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onSubmitOrder={api.createOrder}
        onOrderSuccess={(order) => {
          recordCustomerOrder(order);
          setActiveTrackingOrder(order);
          setJustCompletedOrder(order);
          if (currentUser && order.points_earned) {
            const updated = { ...currentUser, points: (currentUser.points || 0) + order.points_earned };
            setCurrentUser(updated);
            try {
              localStorage.setItem('jogopawon_customer_user', JSON.stringify(updated));
            } catch (e) {
              console.warn(e);
            }
          }
          loadData();
        }}
        currentUser={currentUser}
        onRequireAuth={triggerRequireAuth}
        onGoToProfileAddress={handleGoToProfileAddress}
        onOpenOrderHistory={() => setIsOrderHistoryModalOpen(true)}
      />

      {/* Instant WhatsApp Order Confirmation Modal */}
      <OrderSuccessModal
        order={justCompletedOrder}
        onClose={() => setJustCompletedOrder(null)}
        onOpenTracking={(order) => {
          setJustCompletedOrder(null);
          setActiveTrackingOrder(order);
          setIsTrackingModalOpen(true);
        }}
        adminPhone="6289654190596"
      />

      {/* Floating WhatsApp Contact / CS Button */}
      <WhatsAppFloatingButton adminPhone="6289654190596" />

      {/* Live Order Tracking Modal */}
      <OrderTrackingModal
        order={isTrackingModalOpen ? activeTrackingOrder : null}
        onClose={() => setIsTrackingModalOpen(false)}
        onOrderUpdated={(updated) => {
          setActiveTrackingOrder(updated);
          setOrders((prev) => prev.map((o) => (o.id === updated.id || o.order_number === updated.order_number ? updated : o)));
        }}
        onOpenOrderHistory={() => {
          setIsTrackingModalOpen(false);
          setIsOrderHistoryModalOpen(true);
        }}
      />

      {/* Order History Modal */}
      <OrderHistoryModal
        isOpen={isOrderHistoryModalOpen}
        onClose={() => setIsOrderHistoryModalOpen(false)}
        currentUser={currentUser}
        onSelectOrder={(order) => {
          setIsOrderHistoryModalOpen(false);
          setActiveTrackingOrder(order);
          setIsTrackingModalOpen(true);
        }}
        onReorder={handleReorder}
        onOpenStore={() => {
          setIsOrderHistoryModalOpen(false);
          navigateToTab('catalog');
        }}
      />

      {/* Loyalty Reward Store Modal (Sembako & Poin 1% Keuntungan) */}
      <RewardStoreModal
        isOpen={isRewardModalOpen}
        onClose={() => setIsRewardModalOpen(false)}
        currentUser={currentUser}
        onRequireAuth={(action, message) => triggerRequireAuth(action, message)}
        onPointsUpdated={handlePointsUpdated}
      />

      {/* Progressive Web App (PWA) Install Banner & iOS Guide */}
      <PwaInstallBanner
        forceOpenIosModal={isPwaModalOpen}
        onCloseIosModal={() => setIsPwaModalOpen(false)}
      />
    </div>
  );
};

export default App;
