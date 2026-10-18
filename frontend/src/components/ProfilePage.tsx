import React, { useState, useRef, useEffect, useCallback } from 'react';
import { User, Order, OrderStatus, UserAddress } from '../types';
import { api, realtime } from '../services/api';
import { compressImage } from '../utils/imageCompressor';
import {
  ArrowLeft,
  ArrowRight,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  FileText,
  Coins,
  LogOut,
  Camera,
  Home,
  Lock,
  Shield,
  Eye,
  EyeOff,
  UploadCloud,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Gift,
  AlertCircle,
  Truck,
  Check,
  Package,
  Clock,
  RotateCcw,
  MessageCircle,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  Banknote,
  QrCode,
  CreditCard,
  Copy,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Star,
  CheckCheck,
  Building,
  Navigation,
  Image as ImageIcon,
  ShoppingBag,
  Share2,
  Users,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfilePageProps {
  currentUser: User;
  onBack: () => void;
  onUserUpdated: (user: User) => void;
  onLogout: () => void;
  onOpenRewards: () => void;
  onOpenTracking: () => void;
  onTrackOrder?: (order: Order) => void;
  onReorder?: (order: Order) => void;
  initialTab?: 'orders' | 'profile' | 'address_house' | 'security' | 'coins';
  onBackToCart?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  currentUser,
  onBack,
  onUserUpdated,
  onLogout,
  onOpenRewards,
  onOpenTracking,
  onTrackOrder,
  onReorder,
  initialTab,
  onBackToCart,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'address_house' | 'security' | 'coins'>(
    initialTab || (typeof window !== 'undefined' && window.location.hash === '#alamat' ? 'address_house' : 'orders')
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (typeof window !== 'undefined' && window.location.hash === '#alamat') {
      setActiveTab('address_house');
    }
  }, [initialTab]);

  // Customer orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const formatRupiah = (val: number) => 'Rp' + (val || 0).toLocaleString('id-ID');

  // Fetch customer orders
  const fetchCustomerOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const userPhone = currentUser?.phone || '';
      let fetched: Order[] = [];
      try {
        fetched = await api.getCustomerOrders(userPhone);
      } catch {
        fetched = await api.getAdminOrders().catch(() => []);
      }

      // Ambil order lokal dari localStorage
      let localOrderNumbers: string[] = [];
      try {
        const stored = localStorage.getItem('jogopawon_customer_orders');
        if (stored) localOrderNumbers = JSON.parse(stored);
      } catch {}

      // Filter yang sesuai untuk customer ini
      let matchedOrders = fetched;
      if (userPhone) {
        const cleanPhone = userPhone.replace(/[^0-9]/g, '');
        matchedOrders = fetched.filter((o) => {
          const oPhone = (o.customer_phone || '').replace(/[^0-9]/g, '');
          const phoneMatch = oPhone === cleanPhone || (cleanPhone.length >= 9 && oPhone.endsWith(cleanPhone.slice(-9)));
          const localMatch = localOrderNumbers.includes(o.order_number) || localOrderNumbers.includes(o.id);
          return phoneMatch || localMatch;
        });
      } else if (localOrderNumbers.length > 0) {
        matchedOrders = fetched.filter((o) => localOrderNumbers.includes(o.order_number) || localOrderNumbers.includes(o.id));
      }

      matchedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setOrders(matchedOrders);
    } catch (e) {
      console.warn('Gagal memuat riwayat pesanan akun:', e);
    } finally {
      setLoadingOrders(false);
    }
  }, [currentUser?.phone]);

  useEffect(() => {
    fetchCustomerOrders();

    // Subscribe to realtime update event so completed / processed orders update immediately
    const unsub = realtime.subscribe((msg) => {
      if (msg.event === 'ORDER_STATUS_UPDATED' || msg.event === 'NEW_ORDER') {
        fetchCustomerOrders();
      }
    });

    return () => unsub();
  }, [fetchCustomerOrders]);

  // Form states
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [address, setAddress] = useState(currentUser.address || '');
  const [note, setNote] = useState(currentUser.note || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar_url || '');
  const [housePhotoUrl, setHousePhotoUrl] = useState(currentUser.house_photo_url || '');

  // Password change states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Status & loading
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingHouse, setIsUploadingHouse] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Referral states
  const [isCopiedRef, setIsCopiedRef] = useState(false);
  const [inputReferralCode, setInputReferralCode] = useState('');
  const [isApplyingRef, setIsApplyingRef] = useState(false);
  const [refSuccessMsg, setRefSuccessMsg] = useState('');
  const [refErrorMsg, setRefErrorMsg] = useState('');
  const [referralInfo, setReferralInfo] = useState<any>(null);
  const [isLoadingRefInfo, setIsLoadingRefInfo] = useState(false);

  useEffect(() => {
    if (activeTab === 'coins' && currentUser.phone) {
      setIsLoadingRefInfo(true);
      api.getReferralInfo(currentUser.phone)
        .then((data) => setReferralInfo(data))
        .catch(() => {})
        .finally(() => setIsLoadingRefInfo(false));
    }
  }, [activeTab, currentUser.phone]);

  const effectiveReferralCode = referralInfo?.referral_code || currentUser.referral_code || 'PAWON77';

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(effectiveReferralCode);
    setIsCopiedRef(true);
    setTimeout(() => setIsCopiedRef(false), 2000);
  };

  const handleShareReferralWA = () => {
    const text = `Monggo Bu, belanja sayur subuh segar di JogoPawon praktis diantar ke depan rumah. Pakai kode referral saya *${effectiveReferralCode}* buat dapat bonus Koin Hadiah & Gratis Ongkir!\n\nBelanja di sini: https://jogopawon.com/?ref=${effectiveReferralCode}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputReferralCode.trim()) return;
    setIsApplyingRef(true);
    setRefSuccessMsg('');
    setRefErrorMsg('');
    try {
      const res = await api.applyReferralCode(currentUser.phone, inputReferralCode.trim());
      setRefSuccessMsg(res.message || 'Kode referral berhasil terhubung!');
      if (res.user) {
        onUserUpdated(res.user);
      }
    } catch (err: any) {
      setRefErrorMsg(err.message || 'Gagal menerapkan kode referral.');
    } finally {
      setIsApplyingRef(false);
    }
  };

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const houseInputRef = useRef<HTMLInputElement>(null);

  const presetAvatars = [
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
  ];

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setError(null);
    try {
      const compressed = await compressImage(file, { maxWidth: 600, quality: 0.85 });
      const res = await api.uploadImage(compressed.file, 'jogopawon/avatars');
      if (res && res.url) {
        setAvatarUrl(res.url);
        // Auto-save avatar
        const updated = await api.updateCustomerProfile({
          id: currentUser.id,
          avatar_url: res.url,
        });
        onUserUpdated(updated);
        setSaveSuccess('Foto profil berhasil diperbarui!');
        setTimeout(() => setSaveSuccess(null), 3500);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal mengunggah foto profil.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleHousePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingHouse(true);
    setError(null);
    try {
      const compressed = await compressImage(file, { maxWidth: 1200, quality: 0.85 });
      const res = await api.uploadImage(compressed.file, 'jogopawon/houses');
      if (res && res.url) {
        setHousePhotoUrl(res.url);
        // Auto-save house photo
        const updated = await api.updateCustomerProfile({
          id: currentUser.id,
          house_photo_url: res.url,
        });
        onUserUpdated(updated);
        setSaveSuccess('Foto tampak depan rumah berhasil diunggah!');
        setTimeout(() => setSaveSuccess(null), 3500);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal mengunggah foto rumah.');
    } finally {
      setIsUploadingHouse(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaveSuccess(null);

    try {
      const updated = await api.updateCustomerProfile({
        id: currentUser.id,
        name: name.trim(),
        email: email.trim() || undefined,
        avatar_url: avatarUrl,
      });
      onUserUpdated(updated);
      setSaveSuccess('Nama dan profil berhasil disimpan!');
      setTimeout(() => setSaveSuccess(null), 3500);
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan profil.');
    } finally {
      setIsSaving(false);
    }
  };

  // Saved addresses state (multi-address support)
  const getInitialAddresses = (user: User): UserAddress[] => {
    if (user.saved_addresses && Array.isArray(user.saved_addresses)) {
      return user.saved_addresses;
    }
    if (user.address && user.address.trim()) {
      return [
        {
          id: 'addr-default',
          label: 'Rumah Utama',
          recipient_name: user.name || 'Penerima',
          phone: user.phone || '',
          address: user.address,
          landmark: user.landmark || user.note || '',
          house_photo_url: user.house_photo_url || '',
          is_primary: true,
        },
      ];
    }
    return [];
  };

  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>(() => getInitialAddresses(currentUser));

  // Sync savedAddresses when currentUser updates
  useEffect(() => {
    if (currentUser.saved_addresses !== undefined) {
      setSavedAddresses(currentUser.saved_addresses);
    }
  }, [currentUser.saved_addresses]);

  // Modal state for Add / Edit Address
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [modalLabel, setModalLabel] = useState('Rumah Utama');
  const [modalRecipient, setModalRecipient] = useState(currentUser.name || '');
  const [modalPhone, setModalPhone] = useState(currentUser.phone || '');
  const [modalAddress, setModalAddress] = useState('');
  const [modalLandmark, setModalLandmark] = useState('');
  const [modalHousePhoto, setModalHousePhoto] = useState('');
  const [modalIsPrimary, setModalIsPrimary] = useState(false);
  const [isUploadingModalPhoto, setIsUploadingModalPhoto] = useState(false);
  const modalPhotoInputRef = useRef<HTMLInputElement>(null);

  // Form validation errors & input refs for auto-focus/scrolling
  const [addressFormErrors, setAddressFormErrors] = useState<{ [key: string]: string }>({});
  const labelInputRef = useRef<HTMLInputElement>(null);
  const recipientInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLTextAreaElement>(null);
  const photoSectionRef = useRef<HTMLDivElement>(null);

  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setModalLabel(savedAddresses.length === 0 ? 'Rumah Utama' : 'Alamat Pengantaran');
    setModalRecipient(currentUser.name || '');
    setModalPhone(currentUser.phone || '');
    setModalAddress('');
    setModalLandmark('');
    setModalHousePhoto('');
    setModalIsPrimary(savedAddresses.length === 0);
    setAddressFormErrors({});
    setIsAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: UserAddress) => {
    setEditingAddressId(addr.id);
    setModalLabel(addr.label || 'Rumah Utama');
    setModalRecipient(addr.recipient_name || currentUser.name || '');
    setModalPhone(addr.phone || currentUser.phone || '');
    setModalAddress(addr.address || '');
    setModalLandmark(addr.landmark || '');
    setModalHousePhoto(addr.house_photo_url || '');
    setModalIsPrimary(Boolean(addr.is_primary));
    setAddressFormErrors({});
    setIsAddressModalOpen(true);
  };

  const handleModalPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingModalPhoto(true);
    setError(null);
    try {
      const compressed = await compressImage(file, { maxWidth: 1200, quality: 0.85 });
      const res = await api.uploadImage(compressed.file, 'jogopawon/houses');
      if (res && res.url) {
        setModalHousePhoto(res.url);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal mengunggah foto rumah.');
    } finally {
      setIsUploadingModalPhoto(false);
    }
  };

  const handleSaveModalAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { [key: string]: string } = {};

    if (!modalLabel.trim()) {
      errors.label = 'Label alamat wajib diisi (contoh: Rumah Utama)';
    }

    if (!modalRecipient.trim()) {
      errors.recipient = 'Nama penerima wajib diisi';
    }

    const cleanPhoneDigits = modalPhone.replace(/\D/g, '');
    if (!modalPhone.trim()) {
      errors.phone = 'Nomor WhatsApp penerima wajib diisi';
    } else if (cleanPhoneDigits.length < 8) {
      errors.phone = 'Nomor WhatsApp minimal 8-9 digit angka (contoh: 081234567890)';
    }

    if (!modalAddress.trim()) {
      errors.address = 'Alamat lengkap pengantaran wajib diisi';
    } else if (modalAddress.trim().length < 6) {
      errors.address = 'Alamat terlalu singkat, mohon cantumkan jalan / nomor rumah / RT/RW';
    }

    if (!modalHousePhoto.trim()) {
      errors.photo = 'Foto tampak depan rumah / pagar wajib diunggah untuk kurir subuh!';
    }

    if (Object.keys(errors).length > 0) {
      setAddressFormErrors(errors);
      // Mengarahkan dan fokus ke form field yang belum lengkap / bermasalah
      if (errors.label && labelInputRef.current) {
        labelInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        labelInputRef.current.focus();
      } else if (errors.recipient && recipientInputRef.current) {
        recipientInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        recipientInputRef.current.focus();
      } else if (errors.phone && phoneInputRef.current) {
        phoneInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        phoneInputRef.current.focus();
      } else if (errors.address && addressInputRef.current) {
        addressInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        addressInputRef.current.focus();
      } else if (errors.photo && photoSectionRef.current) {
        photoSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setAddressFormErrors({});

    const willBePrimary = modalIsPrimary || savedAddresses.length === 0;

    let updatedList: UserAddress[];
    if (editingAddressId) {
      updatedList = savedAddresses.map((addr) => {
        if (addr.id === editingAddressId) {
          return {
            ...addr,
            label: modalLabel.trim() || 'Alamat',
            recipient_name: modalRecipient.trim() || currentUser.name,
            phone: modalPhone.trim() || currentUser.phone,
            address: modalAddress.trim(),
            landmark: modalLandmark.trim(),
            house_photo_url: modalHousePhoto.trim(),
            is_primary: willBePrimary,
          };
        }
        return willBePrimary ? { ...addr, is_primary: false } : addr;
      });
    } else {
      const newAddr: UserAddress = {
        id: 'addr_' + Date.now(),
        label: modalLabel.trim() || (savedAddresses.length === 0 ? 'Rumah Utama' : 'Alamat Pengantaran'),
        recipient_name: modalRecipient.trim() || currentUser.name,
        phone: modalPhone.trim() || currentUser.phone,
        address: modalAddress.trim(),
        landmark: modalLandmark.trim(),
        house_photo_url: modalHousePhoto.trim(),
        is_primary: willBePrimary,
      };
      if (willBePrimary) {
        updatedList = savedAddresses.map((a) => ({ ...a, is_primary: false }));
        updatedList.unshift(newAddr);
      } else {
        updatedList = [...savedAddresses, newAddr];
      }
    }

    const primaryAddr = updatedList.find((a) => a.is_primary) || updatedList[0];

    // Optimistically update alamat di local state
    setSavedAddresses(updatedList);
    if (primaryAddr) {
      setAddress(primaryAddr.address);
      setNote(primaryAddr.landmark || '');
      setHousePhotoUrl(primaryAddr.house_photo_url || '');
    }

    // LANGSUNG KELUAR DARI MODAL SETELAH DISIMPAN
    setIsAddressModalOpen(false);
    setSaveSuccess(editingAddressId ? 'Alamat berhasil diperbarui!' : 'Alamat baru berhasil ditambahkan!');
    setTimeout(() => setSaveSuccess(null), 3500);

    setIsSaving(true);
    setError(null);
    try {
      const updated = await api.updateCustomerProfile({
        id: currentUser.id,
        address: primaryAddr ? primaryAddr.address : '',
        landmark: primaryAddr ? primaryAddr.landmark : '',
        note: primaryAddr ? primaryAddr.landmark : '',
        house_photo_url: primaryAddr ? primaryAddr.house_photo_url : '',
        saved_addresses: updatedList,
      });

      onUserUpdated(updated);
    } catch (err: any) {
      console.error('Gagal sinkronisasi alamat ke server:', err);
      setError(err?.message || 'Gagal menyimpan alamat ke server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetPrimaryAddress = async (addressId: string) => {
    setIsSaving(true);
    setError(null);
    try {
      const updatedList = savedAddresses.map((a) => ({
        ...a,
        is_primary: a.id === addressId,
      }));
      const primaryAddr = updatedList.find((a) => a.id === addressId);
      if (!primaryAddr) return;

      setSavedAddresses(updatedList);
      setAddress(primaryAddr.address);
      setNote(primaryAddr.landmark || '');
      setHousePhotoUrl(primaryAddr.house_photo_url || '');

      const updated = await api.updateCustomerProfile({
        id: currentUser.id,
        address: primaryAddr.address,
        landmark: primaryAddr.landmark,
        note: primaryAddr.landmark,
        house_photo_url: primaryAddr.house_photo_url,
        saved_addresses: updatedList,
      });

      onUserUpdated(updated);
      setSaveSuccess(`"${primaryAddr.label}" kini dijadikan sebagai Alamat Utama pengantaran!`);
      setTimeout(() => setSaveSuccess(null), 3500);
    } catch (err: any) {
      setError(err?.message || 'Gagal mengubah alamat utama.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    const target = savedAddresses.find((a) => a.id === addressId);
    if (!target) return;
    if (!window.confirm(`Hapus alamat "${target.label}"?`)) return;

    setIsSaving(true);
    setError(null);
    try {
      let updatedList = savedAddresses.filter((a) => a.id !== addressId);
      if (target.is_primary && updatedList.length > 0) {
        updatedList[0].is_primary = true;
      }
      const primaryAddr = updatedList.find((a) => a.is_primary) || updatedList[0];

      setSavedAddresses(updatedList);
      if (primaryAddr) {
        setAddress(primaryAddr.address);
        setNote(primaryAddr.landmark || '');
        setHousePhotoUrl(primaryAddr.house_photo_url || '');
      } else {
        setAddress('');
        setNote('');
        setHousePhotoUrl('');
      }

      const updated = await api.updateCustomerProfile({
        id: currentUser.id,
        address: primaryAddr ? primaryAddr.address : '',
        landmark: primaryAddr ? primaryAddr.landmark : '',
        note: primaryAddr ? primaryAddr.landmark : '',
        house_photo_url: primaryAddr ? primaryAddr.house_photo_url : '',
        saved_addresses: updatedList,
      });

      onUserUpdated(updated);
      setSaveSuccess('Alamat berhasil dihapus.');
      setTimeout(() => setSaveSuccess(null), 3500);
    } catch (err: any) {
      setError(err?.message || 'Gagal menghapus alamat.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaveSuccess(null);

    if (newPassword.length < 4) {
      setError('Kata sandi baru minimal 4 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await api.updateCustomerProfile({
        id: currentUser.id,
        old_password: oldPassword,
        new_password: newPassword,
      });
      onUserUpdated(updated);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSaveSuccess('Kata sandi / PIN berhasil diubah!');
      setTimeout(() => setSaveSuccess(null), 3500);
    } catch (err: any) {
      setError(err?.message || 'Gagal mengubah kata sandi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-slate-700 hover:text-emerald-700 font-bold text-xs sm:text-sm bg-slate-100 hover:bg-emerald-50 px-3 py-1.5 rounded-full transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600" />
            <span>Kembali ke Toko</span>
          </button>

          <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
            <img src="/logo.webp" alt="Logo" className="h-8 w-auto object-contain rounded" />
            <span className="font-black text-sm sm:text-base text-emerald-950">
              Jogo<span className="text-emerald-700">Pawon</span>
              <span className="ml-1 text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
                AKUN
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-bold bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Customer Hero Card */}
        <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-emerald-900/10 relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar with Upload */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white/90 shadow-xl bg-white/20 flex items-center justify-center text-3xl font-black text-white">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span>{name.charAt(0).toUpperCase() || 'U'}</span>
                )}
              </div>
              <input
                type="file"
                ref={avatarInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute bottom-1 right-1 p-2 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-full shadow-lg border-2 border-white transition-all cursor-pointer active:scale-95"
                title="Ganti Foto Profil"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">{name || 'Pelanggan JogoPawon'}</h1>
                <span className="text-[10px] bg-white/20 text-emerald-100 font-extrabold px-2.5 py-0.5 rounded-full border border-white/20">
                  Member Prioritas
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100 flex items-center justify-center sm:justify-start gap-1.5 font-medium">
                <Phone className="w-3.5 h-3.5 text-emerald-300" />
                <span>{currentUser.phone}</span>
              </p>
              <p className="text-xs text-emerald-200/90 line-clamp-1 flex items-center justify-center sm:justify-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span>{address || 'Belum ada alamat rumah tersimpan'}</span>
              </p>
            </div>

            {/* Loyalty Points Pill Card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center sm:text-right shrink-0 space-y-2 w-full sm:w-auto">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-200 block">Tabungan Koin Pawon</span>
                <span className="text-2xl font-black text-amber-300 flex items-center justify-center sm:justify-end gap-1.5">
                  <Coins className="w-6 h-6 text-amber-400 fill-amber-400 animate-pulse" />
                  {currentUser.points || 0}
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenRewards}
                className="w-full sm:w-auto text-xs bg-amber-400 hover:bg-amber-500 text-amber-950 font-black px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer active:scale-95 inline-flex items-center justify-center gap-1.5"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Tukar Sembako</span>
              </button>
            </div>
          </div>
        </div>

        {/* Success / Error Alerts */}
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-300 font-bold text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccess}</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-200 font-bold text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-200/70 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Pesanan Saya</span>
            {orders.length > 0 && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-full">
                {orders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Profil Saya</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('address_house')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'address_house'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Home className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Alamat & Rumah</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'security'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Sandi / PIN</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('coins')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'coins'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Koin Pawon</span>
          </button>
        </div>

        {/* Tab Content 0: Riwayat Pesanan Saya */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Header Riwayat & Filter Bar */}
            <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                    <Package className="w-5 h-5 text-emerald-600" />
                    <span>Riwayat Pesanan Saya</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Semua pesanan aktif, sedang diantar kurir, maupun yang telah selesai tersimpan di sini.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fetchCustomerOrders()}
                  disabled={loadingOrders}
                  className="self-start sm:self-auto text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Segarkan data pesanan"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${loadingOrders ? 'animate-spin' : ''}`} />
                  <span>Segarkan</span>
                </button>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setOrderFilter('all')}
                  className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                    orderFilter === 'all'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOrderFilter('active')}
                  className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                    orderFilter === 'active'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Sedang Diproses ({orders.filter((o) => ['pending', 'confirmed', 'packing', 'processing', 'shipping'].includes(o.status as string)).length})
                </button>
                <button
                  type="button"
                  onClick={() => setOrderFilter('completed')}
                  className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                    orderFilter === 'completed'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Selesai ({orders.filter((o) => o.status === 'completed' || (o.status as string) === 'delivered').length})
                </button>
                <button
                  type="button"
                  onClick={() => setOrderFilter('cancelled')}
                  className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                    orderFilter === 'cancelled'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Dibatalkan ({orders.filter((o) => o.status === 'cancelled').length})
                </button>
              </div>

              {/* Search Order Number or Product */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Cari berdasarkan nomor pesanan atau nama sayur/barang..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs bg-slate-50 focus:bg-white outline-none font-medium"
                />
              </div>
            </div>

            {/* Orders List Body */}
            {loadingOrders ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">Memuat riwayat pesanan Anda...</p>
              </div>
            ) : (() => {
              const filteredList = orders.filter((o) => {
                if (orderFilter === 'active' && !['pending', 'confirmed', 'packing', 'processing', 'shipping'].includes(o.status as string)) return false;
                if (orderFilter === 'completed' && o.status !== 'completed' && (o.status as string) !== 'delivered') return false;
                if (orderFilter === 'cancelled' && o.status !== 'cancelled') return false;
                if (orderSearch.trim()) {
                  const q = orderSearch.toLowerCase();
                  const matchNum = o.order_number?.toLowerCase().includes(q);
                  const matchItems = (o.items || []).some((it) => it.product_name?.toLowerCase().includes(q));
                  return matchNum || matchItems;
                }
                return true;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-xs space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-3xl">
                      📦
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800">Belum Ada Pesanan di Kategori Ini</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Pesanan belanja Anda akan tercatat secara otomatis di sini dan statusnya dapat dipantau realtime.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onBack}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Mulai Belanja Sekarang
                    </button>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {filteredList.map((order) => {
                    const isCompleted = order.status === 'completed' || (order.status as string) === 'delivered';
                    const isCancelled = order.status === 'cancelled';
                    const isActive = ['pending', 'confirmed', 'packing', 'processing', 'shipping'].includes(order.status as string);

                    let statusBadge = {
                      label: 'Diproses',
                      className: 'bg-blue-50 text-blue-700 border-blue-200',
                      icon: <Clock className="w-3.5 h-3.5" />,
                    };

                    if (order.status === 'pending') {
                      statusBadge = {
                        label: 'Menunggu ACC Admin',
                        className: 'bg-amber-50 text-amber-800 border-amber-200',
                        icon: <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />,
                      };
                    } else if (order.status === 'confirmed') {
                      statusBadge = {
                        label: 'Disetujui Admin',
                        className: 'bg-blue-50 text-blue-800 border-blue-200',
                        icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />,
                      };
                    } else if (order.status === 'packing' || (order.status as string) === 'processing') {
                      statusBadge = {
                        label: 'Sedang Dipacking',
                        className: 'bg-indigo-50 text-indigo-800 border-indigo-200',
                        icon: <Package className="w-3.5 h-3.5 text-indigo-600 animate-spin" />,
                      };
                    } else if (order.status === 'shipping') {
                      statusBadge = {
                        label: 'Sedang Diantar Kurir',
                        className: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold',
                        icon: <Truck className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />,
                      };
                    } else if (order.status === 'completed' || (order.status as string) === 'delivered') {
                      statusBadge = {
                        label: 'Pesanan Selesai',
                        className: 'bg-emerald-100 text-emerald-900 border-emerald-400 font-extrabold',
                        icon: <Check className="w-3.5 h-3.5 text-emerald-700" />,
                      };
                    } else if (order.status === 'cancelled') {
                      statusBadge = {
                        label: 'Dibatalkan',
                        className: 'bg-slate-100 text-slate-600 border-slate-200',
                        icon: <AlertCircle className="w-3.5 h-3.5 text-slate-500" />,
                      };
                    }

                    const itemsCount = (order.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);

                    return (
                      <div
                        key={order.id || order.order_number}
                        className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all space-y-3"
                      >
                        {/* Order Header: No Pesanan, Tanggal, Status */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-xs sm:text-sm text-slate-900">
                                #{order.order_number}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(order.order_number);
                                  setCopiedOrderId(order.order_number);
                                  setTimeout(() => setCopiedOrderId(null), 2000);
                                }}
                                className="text-[10px] text-slate-400 hover:text-emerald-700 cursor-pointer flex items-center gap-0.5"
                                title="Salin Nomor Pesanan"
                              >
                                {copiedOrderId === order.order_number ? (
                                  <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                                    <Check className="w-3 h-3" /> Tersalin
                                  </span>
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <span className="text-[10px] sm:text-[11px] text-slate-400 block">
                              {new Date(order.created_at).toLocaleString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })} WIB
                            </span>
                          </div>

                          <div className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${statusBadge.className}`}>
                            {statusBadge.icon}
                            <span>{statusBadge.label}</span>
                          </div>
                        </div>

                        {/* Jadwal Pengiriman & Kurir */}
                        <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="text-slate-600">
                              Antar: <strong>{order.delivery_slot || 'Pagi Subuh (06:00 - 08:00 WIB)'}</strong>
                              {order.delivery_date && <span className="ml-1 text-slate-400">({order.delivery_date})</span>}
                            </span>
                          </div>
                          {order.courier_name && (
                            <span className="text-[11px] bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-700 font-bold">
                              🛵 Kurir: {order.courier_name}
                            </span>
                          )}
                        </div>

                        {/* Ringkasan Produk */}
                        <div className="space-y-2">
                          {(order.items || []).slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={item.product_image || '/placeholder.png'}
                                  alt={item.product_name}
                                  className="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-slate-200/80 shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-800 truncate">{item.product_name}</p>
                                  <p className="text-[10px] text-slate-400">
                                    {item.quantity}x {item.unit || 'porsi'} {item.variant_name ? `(${item.variant_name})` : ''}
                                  </p>
                                </div>
                              </div>
                              <span className="font-extrabold text-slate-700 shrink-0">
                                {formatRupiah((item.price || 0) * (item.quantity || 1))}
                              </span>
                            </div>
                          ))}
                          {(order.items || []).length > 3 && (
                            <p className="text-[11px] text-slate-400 italic pt-1">
                              +{(order.items || []).length - 3} produk lainnya...
                            </p>
                          )}
                        </div>

                        {/* Total Tagihan & Action Buttons */}
                        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="text-xs">
                            <span className="text-slate-500 block text-[11px]">
                              Total Tagihan ({itemsCount} barang • {order.payment_method?.toUpperCase()}):
                            </span>
                            <span className="text-base font-black text-emerald-800">
                              {formatRupiah(order.total_amount)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Tombol Lacak Pesanan */}
                            <button
                              type="button"
                              onClick={() => {
                                if (onTrackOrder) onTrackOrder(order);
                                else onOpenTracking();
                              }}
                              className="flex-1 sm:flex-initial bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Truck className="w-3.5 h-3.5 text-emerald-200" />
                              <span>Lacak Detail</span>
                            </button>

                            {/* Tombol Pesan Lagi (Re-order) */}
                            {onReorder && (
                              <button
                                type="button"
                                onClick={() => onReorder(order)}
                                className="flex-1 sm:flex-initial bg-amber-100 hover:bg-amber-200 text-amber-950 font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-amber-300"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                                <span>Pesan Lagi</span>
                              </button>
                            )}

                            {/* Tombol Chat WA Admin */}
                            <button
                              type="button"
                              onClick={() => {
                                const itemsSummary = (order.items || [])
                                  .map((it) => `• ${it.quantity}x ${it.product_name} (${it.unit || 'porsi'}) - ${formatRupiah((it.price || 0) * (it.quantity || 1))}`)
                                  .join('\n');
                                const msg = encodeURIComponent(
                                  `Halo Admin JogoPawon Mart, saya ingin bertanya mengenai pesanan saya:\n\n` +
                                  `📋 *No. Order*   : #${order.order_number}\n` +
                                  `👤 *Nama Pemesan*: ${order.customer_name} (${order.customer_phone})\n` +
                                  `📍 *Alamat Kirim*: ${order.delivery_address}\n` +
                                  `📦 *Jadwal Antar*: ${order.po_date || order.delivery_date || '-'} (${order.delivery_slot || 'Pagi'})\n` +
                                  `💵 *Total Tagihan*: *${formatRupiah(order.total_amount)}*\n` +
                                  `💳 *Metode Bayar*: ${order.payment_method?.toUpperCase()} (${order.payment_status === 'paid' ? 'LUNAS' : 'BELUM LUNAS'})\n` +
                                  `⏳ *Status Saat Ini*: *${order.status?.toUpperCase()}*\n\n` +
                                  `🛒 *Rincian Belanja:*\n${itemsSummary}\n\n` +
                                  `Mohon informasinya ya min, terima kasih! 🙏`
                                );
                                window.open(`https://wa.me/6289654190596?text=${msg}`, '_blank', 'noopener,noreferrer');
                              }}
                              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                              title="Tanya Admin di WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Tab Content 1: Profil Saya */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800">Informasi Akun Pribadi</h2>
              <p className="text-xs text-slate-500">Perbarui nama lengkap dan foto profil untuk identitas pesanan belanja Anda.</p>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Pilih Avatar Cepat:</span>
              <div className="flex items-center gap-3">
                {presetAvatars.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAvatarUrl(url)}
                    className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                      avatarUrl === url ? 'border-emerald-600 ring-2 ring-emerald-200 scale-105' : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt="Preset avatar" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">Nama Lengkap / Nama Panggilan:</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Ibu Siti Rahma"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm bg-slate-50 focus:bg-white outline-none font-medium transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">Nomor WhatsApp Terdaftar:</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    disabled
                    value={currentUser.phone}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-100 text-slate-500 text-xs sm:text-sm outline-none font-medium cursor-not-allowed"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Nomor WhatsApp digunakan sebagai ID login permanen Anda.</p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  Email <span className="text-slate-400 font-normal">(Opsional)</span>:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Contoh: nama@gmail.com"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm bg-slate-50 focus:bg-white outline-none font-medium transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-6 rounded-2xl text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
              </button>
            </form>
          </div>
        )}

        {/* Tab Content 2: Alamat & Foto Rumah (Buku Multi-Alamat) */}
        {activeTab === 'address_house' && (
          <div className="space-y-4">
            {/* Banner Kembali ke Keranjang jika user diarahkan dari proses checkout */}
            {onBackToCart && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white rounded-3xl p-4 sm:p-5 shadow-lg shadow-emerald-900/10 flex flex-col sm:flex-row items-center justify-between gap-3 border border-emerald-600"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs sm:text-sm font-black">Sedang Menyelesaikan Pesanan di Keranjang?</p>
                    <p className="text-[11px] text-emerald-100/90 leading-tight">
                      Setelah mengatur alamat pengantaran & foto rumah di bawah, klik tombol di samping untuk langsung kembali belanja.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onBackToCart}
                  className="bg-amber-400 hover:bg-amber-500 text-amber-950 font-black text-xs px-4 py-2.5 rounded-2xl shadow transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 active:scale-95"
                >
                  <span>🛒 Kembali ke Keranjang</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}

            {/* Container Utama Buku Alamat */}
            <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                    <span>Buku Alamat & Panduan Kurir Subuh</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kelola alamat rumah utama atau alamat lainnya (misal: Rumah Mertua, Kantor, Kos). Kurir subuh membutuhkan foto rumah & patokan agar pengantaran tepat sasaran di pagi hari.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddAddress}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2.5 rounded-2xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Alamat Baru</span>
                </button>
              </div>

              {/* Daftar Alamat Tersimpan */}
              {savedAddresses.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-3 bg-slate-50">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                    <Home className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-800">Belum Ada Alamat Pengantaran</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      Tulis alamat lengkap rumah, patokan, dan unggah foto tampak depan rumah agar kurir subuh tidak keliru mengantar pesanan Anda.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddAddress}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-2.5 rounded-2xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tulis Alamat Rumah Sekarang</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                        addr.is_primary
                          ? 'border-emerald-500 bg-emerald-50/20 shadow-xs ring-1 ring-emerald-500/30'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        {/* Detail Alamat */}
                        <div className="flex-1 space-y-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                              <Building className="w-4 h-4 text-slate-400" />
                              <span>{addr.label || 'Alamat Pengantaran'}</span>
                            </span>

                            {addr.is_primary ? (
                              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
                                <span>Alamat Utama</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleSetPrimaryAddress(addr.id)}
                                className="text-[10px] font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-0.5 rounded-full border border-slate-200 transition-colors cursor-pointer"
                              >
                                Jadikan Alamat Utama
                              </button>
                            )}
                          </div>

                          <div className="text-xs text-slate-700 space-y-1.5">
                            <p className="font-bold flex items-center gap-1.5 text-slate-800">
                              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                              <span>{addr.recipient_name || currentUser.name}</span>
                              <span className="text-slate-300 font-normal">•</span>
                              <Phone className="w-3.5 h-3.5 text-slate-400 ml-1" />
                              <span className="text-slate-500 font-normal">{addr.phone || currentUser.phone}</span>
                            </p>
                            <p className="flex items-start gap-1.5 leading-relaxed text-slate-800">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{addr.address}</span>
                            </p>
                            {addr.landmark && (
                              <div className="flex items-start gap-1.5 text-amber-950 bg-amber-50/90 p-2.5 rounded-2xl border border-amber-200 font-normal text-[11px] leading-relaxed">
                                <Navigation className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <span>
                                  <strong>Patokan / Petunjuk Kurir Subuh:</strong> {addr.landmark}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Tombol Aksi */}
                          <div className="pt-2 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditAddress(addr)}
                              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                              <span>Ubah Alamat</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="text-xs text-red-600 hover:bg-red-50 font-bold px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                              title="Hapus Alamat"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>

                        {/* Preview Foto Rumah */}
                        <div className="w-full sm:w-44 shrink-0 space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
                            Foto Rumah / Pagar
                          </span>
                          {addr.house_photo_url ? (
                            <div className="relative group rounded-2xl overflow-hidden border-2 border-emerald-300 shadow-2xs aspect-video bg-slate-100">
                              <img
                                src={addr.house_photo_url}
                                alt="Foto Rumah"
                                className="w-full h-full object-cover"
                              />
                              <a
                                href={addr.house_photo_url}
                                target="_blank"
                                rel="noreferrer"
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Lihat Penuh</span>
                              </a>
                            </div>
                          ) : (
                            <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 aspect-video flex flex-col items-center justify-center p-2 text-center text-amber-800">
                              <Camera className="w-5 h-5 text-amber-500 mb-1" />
                              <span className="text-[10px] font-bold">Belum Ada Foto Rumah</span>
                              <button
                                type="button"
                                onClick={() => handleOpenEditAddress(addr)}
                                className="text-[9px] text-emerald-700 underline font-bold mt-0.5 cursor-pointer"
                              >
                                + Unggah Foto
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Tambah / Ubah Alamat */}
            <AnimatePresence>
              {isAddressModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 pb-28 sm:pb-8 bg-black/60 backdrop-blur-xs overflow-y-auto">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto max-h-[88vh] overflow-y-auto"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-base font-black text-slate-800">
                          {editingAddressId ? 'Ubah Alamat Pengantaran' : 'Tambah Alamat Pengantaran Baru'}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Lengkapi alamat, patokan, dan foto rumah untuk kemudahan kurir subuh.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddressModalOpen(false)}
                        className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form noValidate onSubmit={handleSaveModalAddress} className="space-y-4">
                      {/* Jenis / Label Alamat (Pilihan Tunggal Chip) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-black text-slate-700">
                            Jenis / Label Rumah: <span className="text-red-500">*</span>
                          </label>
                          {addressFormErrors.label && (
                            <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              {addressFormErrors.label}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: 'Rumah Utama', icon: '🏠', desc: 'Tempat tinggal utama' },
                            { id: 'Rumah Orang Tua', icon: '🏡', desc: 'Keluarga / orang tua' },
                            { id: 'Kantor / Kerja', icon: '🏢', desc: 'Tempat kerja' },
                            { id: 'Kos / Kontrakan', icon: '🚪', desc: 'Kos atau sewa' },
                          ].map((item) => {
                            const isSelected = modalLabel === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setModalLabel(item.id);
                                  if (addressFormErrors.label) setAddressFormErrors((prev) => ({ ...prev, label: '' }));
                                }}
                                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                  isSelected
                                    ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/30 text-emerald-950 shadow-2xs'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full mb-1">
                                  <span className="text-lg">{item.icon}</span>
                                  {isSelected && (
                                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                                      ✓
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <span className="font-extrabold text-xs block leading-tight">
                                    {item.id}
                                  </span>
                                  <span className="text-[9px] text-slate-400 block mt-0.5">
                                    {item.desc}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Nama & Telepon Penerima */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-black text-slate-700">
                              Nama Penerima: <span className="text-red-500">*</span>
                            </label>
                          </div>
                          <input
                            ref={recipientInputRef}
                            type="text"
                            value={modalRecipient}
                            onChange={(e) => {
                              setModalRecipient(e.target.value);
                              if (addressFormErrors.recipient) setAddressFormErrors((prev) => ({ ...prev, recipient: '' }));
                            }}
                            placeholder="Nama penerima di rumah"
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm outline-none font-medium transition-all ${
                              addressFormErrors.recipient
                                ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/50 text-red-950 focus:border-red-600 focus:ring-red-500/30'
                                : 'border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50 focus:bg-white text-slate-900'
                            }`}
                          />
                          {addressFormErrors.recipient && (
                            <p className="text-[11px] font-bold text-red-600 flex items-center gap-1 mt-1">
                              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <span>{addressFormErrors.recipient}</span>
                            </p>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-black text-slate-700">
                              WhatsApp Penerima: <span className="text-red-500">*</span>
                            </label>
                          </div>
                          <input
                            ref={phoneInputRef}
                            type="tel"
                            value={modalPhone}
                            onChange={(e) => {
                              setModalPhone(e.target.value);
                              if (addressFormErrors.phone) setAddressFormErrors((prev) => ({ ...prev, phone: '' }));
                            }}
                            placeholder="081234567890"
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm outline-none font-medium transition-all ${
                              addressFormErrors.phone
                                ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/50 text-red-950 focus:border-red-600 focus:ring-red-500/30'
                                : 'border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50 focus:bg-white text-slate-900'
                            }`}
                          />
                          {addressFormErrors.phone && (
                            <p className="text-[11px] font-bold text-red-600 flex items-center gap-1 mt-1">
                              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <span>{addressFormErrors.phone}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Alamat Lengkap */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-black text-slate-700">
                            Alamat Lengkap Rumah (Pasuruan): <span className="text-red-500">*</span>
                          </label>
                          {addressFormErrors.address && (
                            <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              {addressFormErrors.address}
                            </span>
                          )}
                        </div>
                        <textarea
                          ref={addressInputRef}
                          rows={2}
                          value={modalAddress}
                          onChange={(e) => {
                            setModalAddress(e.target.value);
                            if (addressFormErrors.address) setAddressFormErrors((prev) => ({ ...prev, address: '' }));
                          }}
                          placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan/desa, kecamatan"
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium resize-none leading-relaxed outline-none transition-all ${
                            addressFormErrors.address
                              ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/50 text-red-950 focus:border-red-600 focus:ring-red-500/30'
                              : 'border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-slate-50 focus:bg-white text-slate-900'
                          }`}
                        />
                      </div>

                      {/* Patokan Rumah / Catatan Kurir Subuh */}
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-1">
                          Patokan Rumah / Petunjuk Kurir Subuh:
                        </label>
                        <input
                          type="text"
                          value={modalLandmark}
                          onChange={(e) => setModalLandmark(e.target.value)}
                          placeholder="Contoh: Pagar besi hitam, persis depan Musholla, ada pohon mangga"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm bg-slate-50 focus:bg-white outline-none font-medium"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Patokan sangat membantu kurir subuh saat jalanan masih gelap di pagi hari.
                        </span>
                      </div>

                      {/* Foto Tampak Depan Rumah (Wajib Diisi) */}
                      <div
                        ref={photoSectionRef}
                        className={`pt-2.5 p-3 rounded-2xl border transition-all ${
                          addressFormErrors.photo
                            ? 'bg-red-50/70 border-red-400 ring-2 ring-red-400/30'
                            : 'border-slate-100'
                        } space-y-2`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-black text-slate-800">
                            Foto Tampak Depan Rumah / Pagar (Panduan Kurir): <span className="text-red-500">*</span>
                          </label>
                          {addressFormErrors.photo && (
                            <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              Wajib Foto
                            </span>
                          )}
                        </div>

                        {addressFormErrors.photo && (
                          <div className="p-2 bg-red-100 border border-red-300 rounded-xl text-[11px] font-bold text-red-700 flex items-center gap-1.5 animate-pulse">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>{addressFormErrors.photo}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          {modalHousePhoto ? (
                            <div className="relative group w-28 h-20 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-2xs shrink-0 bg-slate-100">
                              <img src={modalHousePhoto} alt="Foto Rumah" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setModalHousePhoto('')}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700"
                                title="Hapus Foto"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className={`w-28 h-20 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-2 text-center shrink-0 transition-colors ${
                              addressFormErrors.photo
                                ? 'border-red-400 bg-red-50 text-red-500'
                                : 'border-slate-300 bg-slate-50 text-slate-400'
                            }`}>
                              <Camera className={`w-5 h-5 mb-0.5 ${addressFormErrors.photo ? 'text-red-500 animate-bounce' : 'text-slate-400'}`} />
                              <span className="text-[9px] font-bold">
                                {addressFormErrors.photo ? '⚠️ Belum Ada' : 'Belum ada foto'}
                              </span>
                            </div>
                          )}

                          <div className="flex-1 space-y-1">
                            <input
                              type="file"
                              ref={modalPhotoInputRef}
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                handleModalPhotoUpload(e);
                                if (addressFormErrors.photo) {
                                  setAddressFormErrors((prev) => ({ ...prev, photo: '' }));
                                }
                              }}
                            />
                            <button
                              type="button"
                              disabled={isUploadingModalPhoto}
                              onClick={() => modalPhotoInputRef.current?.click()}
                              className={`font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs w-full sm:w-auto ${
                                addressFormErrors.photo
                                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20 animate-pulse'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                              }`}
                            >
                              <UploadCloud className="w-4 h-4" />
                              <span>{isUploadingModalPhoto ? 'Mengunggah...' : modalHousePhoto ? 'Ganti Foto Rumah' : '📸 Ambil / Unggah Foto Rumah'}</span>
                            </button>
                            <p className="text-[10px] text-slate-500">
                              Kurir subuh butuh foto pagar/tampak depan agar tidak salah antar saat pagi hari.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Checkbox Jadikan Utama */}
                      <label className="flex items-center gap-2 pt-2 border-t border-slate-100 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={modalIsPrimary}
                          onChange={(e) => setModalIsPrimary(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span className="text-xs font-bold text-slate-700">
                          Jadikan sebagai Alamat Utama (Default Pengantaran)
                        </span>
                      </label>

                      {/* Tombol Simpan & Batal (Sticky di Bawah Modal agar tidak tertutup) */}
                      <div className="sticky -bottom-5 sm:-bottom-6 -mx-5 sm:-mx-6 px-5 sm:px-6 py-3.5 bg-white/95 backdrop-blur-md border-t border-slate-100 flex items-center justify-end gap-2.5 z-20 rounded-b-3xl shadow-lg">
                        <button
                          type="button"
                          onClick={() => setIsAddressModalOpen(false)}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={isSaving || isUploadingModalPhoto}
                          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                        >
                          {isSaving ? 'Menyimpan...' : 'Simpan Alamat'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Tab Content 3: Ganti Kata Sandi / PIN */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800">Keamanan & Ubah Kata Sandi / PIN</h2>
              <p className="text-xs text-slate-500">Perbarui kata sandi atau PIN untuk melindungi akun dan saldo koin Anda.</p>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">Kata Sandi / PIN Saat Ini:</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan sandi saat ini"
                    className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm bg-slate-50 focus:bg-white outline-none font-medium transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 p-1"
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">Kata Sandi / PIN Baru:</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm bg-slate-50 focus:bg-white outline-none font-medium transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 p-1"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">Konfirmasi Kata Sandi Baru:</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi sandi baru"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm bg-slate-50 focus:bg-white outline-none font-medium transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-6 rounded-2xl text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Menyimpan...' : 'Perbarui Kata Sandi'}
              </button>
            </form>
          </div>
        )}

        {/* Tab Content 4: Koin Pawon & Hadiah */}
        {activeTab === 'coins' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-800">Saldo Koin Loyalitas & Hadiah</h2>
                <p className="text-xs text-slate-500">Kumpulkan koin dari setiap belanjaan dan tukarkan dengan hadiah sembako pilihan.</p>
              </div>
              <span className="text-2xl">🎁</span>
            </div>

            <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-amber-950 rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-black uppercase tracking-wider block opacity-80">Saldo Koin Aktif</span>
                <span className="text-3xl sm:text-4xl font-black">{currentUser.points || 0} Koin</span>
                <p className="text-xs font-semibold mt-1 opacity-90">1 Koin = Senilai tabungan keuntungan sayur Anda</p>
              </div>
              <button
                type="button"
                onClick={onOpenRewards}
                className="bg-amber-950 hover:bg-amber-900 text-white font-black px-5 py-3 rounded-xl text-xs sm:text-sm shadow-lg transition-all cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <Gift className="w-4 h-4 text-amber-300" />
                <span>Buka Katalog Hadiah Sembako</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="font-black text-slate-800 block">1. Belanja Harian Dapat Koin</span>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Setiap kali Anda memesan sayur, sembako, dan lauk segar, koin belanja otomatis terkumpul di akun Anda.
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="font-black text-slate-800 block">2. Koin Tidak Hangus</span>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Saldo koin Anda tersimpan aman selamanya dan tidak ada batas masa kedaluwarsa.
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="font-black text-slate-800 block">3. Hadiah Diantar ke Rumah</span>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Tukarkan dengan Minyak Goreng, Beras, Telur, atau Alat Dapur yang langsung diantar kurir subuh.
                </p>
              </div>
            </div>

            {/* Program Duta Sayur / Bagi Rezeki Pawon (Referral) */}
            <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-emerald-700/50 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🤝</span>
                    <h3 className="text-base sm:text-lg font-black text-amber-300">Bagi Rezeki Pawon — Ajak Teman</h3>
                  </div>
                  <p className="text-xs text-emerald-100/80 mt-0.5">
                    Ajak tetangga & kawan belanja sayur. Dapatkan bonus koin tambahan setiap kali teman Anda berbelanja!
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-800/60 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-200">
                  <Coins className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>Bonus Koin Referral Seumur Hidup</span>
                </div>
              </div>

              {/* Kode Unik & Tombol Share */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 block">
                    Kode Referral Unik Anda
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="font-mono text-2xl sm:text-3xl font-black text-white tracking-widest bg-emerald-950/60 px-3.5 py-1 rounded-xl border border-emerald-500/30">
                      {effectiveReferralCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyReferral}
                      className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                    >
                      {isCopiedRef ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white" />}
                      <span>{isCopiedRef ? 'Tersalin!' : 'Salin'}</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleShareReferralWA}
                  className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-black py-3 px-5 rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Bagikan ke WhatsApp</span>
                </button>
              </div>

              {/* Statistik Referral Pengguna */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-emerald-950/40 border border-emerald-700/40 rounded-2xl p-4 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-800/80 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div>
                    <span className="text-[11px] text-emerald-300/80 font-semibold block">Teman Diajak</span>
                    <span className="text-xl font-black text-white">{currentUser.referral_count || 0} Tetangga</span>
                  </div>
                </div>

                <div className="bg-emerald-950/40 border border-emerald-700/40 rounded-2xl p-4 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Coins className="w-5 h-5 text-amber-400 fill-amber-400" />
                  </div>
                  <div>
                    <span className="text-[11px] text-amber-200/80 font-semibold block">Koin dari Belanja Teman (5% Laba)</span>
                    <span className="text-xl font-black text-amber-300">+{currentUser.referral_earnings || 0} Koin</span>
                  </div>
                </div>
              </div>

              {/* Terhubung dengan Pengundang */}
              {currentUser.referred_by ? (
                <div className="bg-emerald-800/40 border border-emerald-500/30 rounded-2xl p-3 text-xs text-emerald-200 flex items-center justify-between">
                  <span>
                    Anda terdaftar atas undangan: <strong className="text-white font-mono">{currentUser.referred_by}</strong>
                  </span>
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-200 font-bold px-2 py-0.5 rounded-md">
                    Terhubung ✓
                  </span>
                </div>
              ) : (
                <form onSubmit={handleApplyReferral} className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-xs space-y-2">
                  <span className="text-[11px] font-bold text-emerald-200 block">
                    Punya Kode Referral dari Tetangga yang Mengajakmu?
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={10}
                      value={inputReferralCode}
                      onChange={(e) => setInputReferralCode(e.target.value.toUpperCase())}
                      placeholder="Masukkan kode 7 karakter teman"
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs font-mono uppercase tracking-wider text-white placeholder-slate-400 outline-none focus:border-emerald-400"
                    />
                    <button
                      type="submit"
                      disabled={isApplyingRef}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isApplyingRef ? 'Menghubungkan...' : 'Hubungkan'}
                    </button>
                  </div>
                  {refSuccessMsg && <p className="text-[11px] text-emerald-300 font-bold">{refSuccessMsg}</p>}
                  {refErrorMsg && <p className="text-[11px] text-rose-300 font-bold">{refErrorMsg}</p>}
                </form>
              )}

              {/* Rincian Pendapatan Koin dari Teman yang Diundang */}
              <div className="bg-slate-950/60 border border-emerald-800/50 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                    <span>👥</span>
                    <span>Teman yang Bergabung & Pendapatan Koin</span>
                  </h4>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
                    5% dari Laba Belanja
                  </span>
                </div>

                {isLoadingRefInfo ? (
                  <p className="text-center py-4 text-xs text-slate-400 animate-pulse">Memuat data teman...</p>
                ) : referralInfo?.friends && referralInfo.friends.length > 0 ? (
                  <div className="space-y-2">
                    {referralInfo.friends.map((friend: any) => (
                      <div key={friend.id} className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3 text-xs transition-all">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-700/60 text-white font-black flex items-center justify-center text-xs shrink-0">
                            {friend.name ? friend.name.charAt(0).toUpperCase() : 'T'}
                          </div>
                          <div>
                            <p className="font-bold text-white text-xs leading-tight">{friend.name}</p>
                            <p className="text-[10px] text-emerald-300/80 font-mono">{friend.phone_masked} • {friend.orders_count} pesanan</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-amber-300 text-xs sm:text-sm">+{friend.earnings_generated} Koin</p>
                          <p className="text-[9px] text-slate-400">Total belanja: Rp {Math.round(friend.total_spent).toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5 text-xs text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-300">Belum ada tetangga yang menggunakan kodemu.</p>
                    <p className="text-[11px] text-slate-500">Klik "Bagikan ke WhatsApp" di atas untuk mulai mengajak dan kumpulkan koin gratis!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
