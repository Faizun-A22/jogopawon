import React, { useState, useRef } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { compressImage } from '../utils/imageCompressor';
import {
  X,
  User as UserIcon,
  Phone,
  MapPin,
  FileText,
  Coins,
  Edit2,
  Check,
  LogOut,
  ShoppingBag,
  Gift,
  RefreshCw,
  Camera,
  Home,
  Lock,
  Shield,
  Eye,
  EyeOff,
  UploadCloud,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUserUpdated: (user: User) => void;
  onLogout: () => void;
  onOpenRewards: () => void;
  onOpenTracking: () => void;
  onOpenOrderHistory?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  onLogout,
  onOpenRewards,
  onOpenTracking,
  onOpenOrderHistory,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'address_house' | 'security' | 'coins'>('profile');

  // Form states
  const [name, setName] = useState(currentUser.name || '');
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

  // Loading & status states
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingHouse, setIsUploadingHouse] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const houseInputRef = useRef<HTMLInputElement>(null);

  // Sync state when currentUser changes or modal opens
  React.useEffect(() => {
    setName(currentUser.name || '');
    setAddress(currentUser.address || '');
    setNote(currentUser.note || '');
    setAvatarUrl(currentUser.avatar_url || '');
    setHousePhotoUrl(currentUser.house_photo_url || '');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSaveSuccess(null);
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  // Preset quick avatars if customer doesn't want to upload personal photo
  const presetAvatars = [
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
  ];

  // Upload Avatar Handler
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setError(null);
    try {
      const compressed = await compressImage(file, { maxWidth: 500, maxHeight: 500, quality: 0.85 });
      const res = await api.uploadImage(compressed.file, 'jogopawon/avatars');
      if (res && res.url) {
        setAvatarUrl(res.url);
        // Otomatis update ke database
        const updated = await api.updateCustomerProfile({
          id: currentUser.id,
          avatar_url: res.url,
        });
        onUserUpdated(updated);
        setSaveSuccess('Foto profil berhasil diunggah!');
        setTimeout(() => setSaveSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal mengupload foto profil');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // Upload House Photo Handler (Foto Tampak Depan Rumah/Pagar untuk Kurir Subuh)
  const handleHouseFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingHouse(true);
    setError(null);
    try {
      const compressed = await compressImage(file, { maxWidth: 1280, maxHeight: 960, quality: 0.85 });
      const res = await api.uploadImage(compressed.file, 'jogopawon/houses');
      if (res && res.url) {
        setHousePhotoUrl(res.url);
        // Otomatis update ke database
        const updated = await api.updateCustomerProfile({
          id: currentUser.id,
          house_photo_url: res.url,
        });
        onUserUpdated(updated);
        setSaveSuccess('Foto rumah/pagar berhasil disimpan untuk panduan kurir!');
        setTimeout(() => setSaveSuccess(null), 3500);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal mengupload foto rumah');
    } finally {
      setIsUploadingHouse(false);
      if (houseInputRef.current) houseInputRef.current.value = '';
    }
  };

  // Submit Profile & Settings
  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Nama lengkap tidak boleh kosong');
      return;
    }
    if (!address.trim()) {
      setError('Alamat pengiriman tidak boleh kosong');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 4) {
        setError('Kata sandi baru minimal 4 karakter');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Konfirmasi kata sandi baru tidak cocok');
        return;
      }
    }

    setIsSaving(true);
    try {
      const updated = await api.updateCustomerProfile({
        id: currentUser.id,
        name: name.trim(),
        address: address.trim(),
        note: note.trim(),
        avatar_url: avatarUrl,
        house_photo_url: housePhotoUrl,
        old_password: oldPassword.trim() || undefined,
        new_password: newPassword.trim() || undefined,
      });

      onUserUpdated(updated);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSaveSuccess('Pengaturan akun berhasil disimpan ke database!');
      setTimeout(() => setSaveSuccess(null), 3500);
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan perubahan');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-100 relative max-h-[92vh] flex flex-col"
      >
        {/* Hidden File Inputs */}
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarFileSelect}
        />
        <input
          ref={houseInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleHouseFileSelect}
        />

        {/* Header Profil & Cover */}
        <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white p-5 sm:p-6 relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white/90 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            {/* Foto Profil / Avatar dengan Tombol Upload */}
            <div className="relative group">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/40 overflow-hidden flex items-center justify-center shadow-lg relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-white">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'P'}
                  </span>
                )}
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-emerald-600 hover:bg-emerald-500 border-2 border-white text-white rounded-xl shadow-md cursor-pointer transition-transform active:scale-90"
                title="Ganti Foto Profil"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black leading-tight text-white truncate">
                  {currentUser.name}
                </h3>
                <span className="text-[10px] bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 font-bold px-2 py-0.5 rounded-full shrink-0">
                  Pelanggan
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-mono flex items-center gap-1 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-emerald-300" />
                {currentUser.phone}
              </p>
            </div>
          </div>

          {/* Saldo Koin Pawon Banner */}
          <div className="mt-4 bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl animate-pulse">🪙</span>
              <div>
                <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-extrabold">
                  Saldo Koin Pawon Anda
                </p>
                <p className="text-base font-black text-amber-300 leading-tight">
                  {currentUser.points || 0} <span className="text-xs text-white">Koin</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRewards();
              }}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-amber-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5" /> Tukar Sembako
            </button>
          </div>
        </div>

        {/* Tabs Bar Pengaturan */}
        <div className="flex border-b border-slate-100 bg-slate-50 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 px-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-800 bg-white font-black'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Profil</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('address_house')}
            className={`flex-1 py-3 px-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'address_house'
                ? 'border-emerald-600 text-emerald-800 bg-white font-black'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Alamat & Rumah</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-3 px-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'security'
                ? 'border-emerald-600 text-emerald-800 bg-white font-black'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Sandi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('coins')}
            className={`flex-1 py-3 px-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'coins'
                ? 'border-emerald-600 text-emerald-800 bg-white font-black'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Pesanan</span>
          </button>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 text-emerald-800 p-3 rounded-2xl border border-emerald-200 font-bold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccess}</span>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 text-red-700 p-3 rounded-2xl border border-red-200 font-bold"
            >
              ⚠️ {error}
            </motion.div>
          )}

          <form onSubmit={handleSaveAll} className="space-y-4">
            {/* TAB 1: PROFIL & FOTO */}
            {activeTab === 'profile' && (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Nama Lengkap / Panggilan:
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Ibu Siti Rahma"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs bg-slate-50 text-slate-900 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Nomor WhatsApp (Terdaftar):
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.phone}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-100 text-slate-500 cursor-not-allowed outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Nomor WhatsApp digunakan sebagai identitas akun utama dan konfirmasi kurir.
                  </p>
                </div>

                {/* Preset Avatars */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">
                    Atau Pilih Avatar Siap Pakai:
                  </label>
                  <div className="flex items-center gap-3">
                    {presetAvatars.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setAvatarUrl(url)}
                        className={`w-11 h-11 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          avatarUrl === url ? 'border-emerald-600 ring-2 ring-emerald-500/30 scale-105' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <img src={url} alt="preset" className="w-full h-full object-cover" />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="h-11 px-3 rounded-xl border border-dashed border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" /> Upload Foto
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ALAMAT & FOTO TAMPAK DEPAN RUMAH (UNTUK KURIR SUBUH) */}
            {activeTab === 'address_house' && (
              <div className="space-y-4">
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 flex items-start gap-2.5 text-emerald-950">
                  <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Penting untuk Pengantaran Subuh:</strong> Kurir kami mulai mengantar jam 06:00 pagi. Foto tampak depan rumah / pagar sangat membantu kurir mengenali rumah Anda dan tidak nyasar ke tetangga.
                  </p>
                </div>

                {/* Field Alamat */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Alamat Lengkap Pengiriman:
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Jalan, No Rumah, RT/RW, Dusun/Desa, Kecamatan, Kota Pasuruan..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs bg-slate-50 text-slate-900 outline-none resize-none transition-all"
                  />
                </div>

                {/* Field Patokan */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Patokan Rumah / Catatan Khusus:
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Contoh: Pagar cokelat depan pohon kelapa, seberang musala"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 text-xs bg-slate-50 text-slate-900 outline-none transition-all"
                  />
                </div>

                {/* Field Foto Tampak Depan Rumah */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 flex items-center justify-between">
                    <span>Foto Tampak Depan Rumah / Pagar:</span>
                    {housePhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setHousePhotoUrl('')}
                        className="text-[10px] text-red-600 hover:underline cursor-pointer"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </label>

                  {housePhotoUrl ? (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 group bg-slate-900">
                      <img
                        src={housePhotoUrl}
                        alt="Foto Rumah"
                        className="w-full h-44 object-cover object-center group-hover:opacity-85 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                        <button
                          type="button"
                          onClick={() => houseInputRef.current?.click()}
                          className="px-3 py-1.5 bg-white text-slate-900 rounded-xl font-bold text-xs flex items-center gap-1 shadow-md cursor-pointer hover:bg-slate-100"
                        >
                          <Camera className="w-3.5 h-3.5" /> Ganti Foto Rumah
                        </button>
                      </div>
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                        <Home className="w-3 h-3 text-emerald-400" /> Tampak Depan Rumah
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => houseInputRef.current?.click()}
                      disabled={isUploadingHouse}
                      className="w-full border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-5 flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50/50 transition-all cursor-pointer"
                    >
                      {isUploadingHouse ? (
                        <>
                          <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
                          <span className="font-bold text-xs text-slate-700">Mengunggah Foto Rumah...</span>
                        </>
                      ) : (
                        <>
                          <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                            <Camera className="w-5 h-5" />
                          </div>
                          <span className="font-bold text-xs text-slate-800">
                            Ambil / Upload Foto Tampak Depan Rumah
                          </span>
                          <span className="text-[10px] text-slate-400 text-center max-w-xs">
                            Format JPG, PNG atau WebP (Bisa foto dari kamera HP langsung)
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: KEAMANAN & GANTI KATA SANDI */}
            {activeTab === 'security' && (
              <div className="space-y-3.5">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-600 text-[11px] leading-relaxed flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Isi kolom di bawah ini hanya jika Anda ingin mengubah kata sandi akun belanja Anda.</span>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Kata Sandi Lama (Saat Ini):
                  </label>
                  <div className="relative">
                    <input
                      type={showOldPassword ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Masukkan kata sandi saat ini"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 text-xs bg-slate-50 text-slate-900 outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Kata Sandi Baru:
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 4 karakter"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 text-xs bg-slate-50 text-slate-900 outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Ulangi Kata Sandi Baru:
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang kata sandi baru"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 text-xs bg-slate-50 text-slate-900 outline-none"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: KOIN & RIWAYAT PESANAN */}
            {activeTab === 'coins' && (
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-amber-950 text-sm flex items-center gap-1.5">
                      🪙 Koin Pawon Anda: <strong className="text-emerald-700">{currentUser.points || 0} Poin</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenRewards();
                      }}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                    >
                      Tukar
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-900/80 leading-relaxed">
                    Tiap belanja produk di JogoPawon menghasilkan koin loyalitas yang bisa ditukar dengan Beras, Minyak, Telur, dan Voucher Belanja!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenOrderHistory) onOpenOrderHistory();
                    else onOpenTracking();
                  }}
                  className="w-full py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="w-4 h-4 text-emerald-600" />
                    <span>Lacak Pesanan PO & Riwayat Belanja</span>
                  </div>
                  <span className="text-slate-400">→</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="w-full py-3 px-4 rounded-xl border border-red-200 bg-red-50/40 hover:bg-red-50 text-red-600 font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer mt-4"
                >
                  <LogOut className="w-4 h-4" /> Keluar dari Akun (Logout)
                </button>
              </div>
            )}

            {/* Tombol Simpan (Untuk Tab 1, 2, 3) */}
            {activeTab !== 'coins' && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Simpan Perubahan Pengaturan
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
};
