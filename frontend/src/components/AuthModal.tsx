import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import {
  X,
  Lock,
  Phone,
  User as UserIcon,
  MapPin,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Gift,
  Coins,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialMode?: 'login' | 'register';
  promptMessage?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
  promptMessage,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync mode if initialMode changes
  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const digits = phone.replace(/\D/g, '');
    let cleanPhone = digits;
    if (digits.startsWith('62')) {
      cleanPhone = '0' + digits.slice(2);
    } else if (digits.startsWith('8')) {
      cleanPhone = '0' + digits;
    }

    if (!cleanPhone || cleanPhone.length < 8) {
      setError('Mohon masukkan nomor WhatsApp yang valid (minimal 8 digit).');
      return;
    }

    if (!password.trim() || password.length < 4) {
      setError('Mohon masukkan kata sandi minimal 4 karakter.');
      return;
    }

    setLoading(true);
    try {
      let loggedUser: User;
      if (mode === 'login') {
        loggedUser = await api.loginCustomer(cleanPhone, password.trim());
      } else {
        if (!name.trim()) {
          setError('Mohon isi nama lengkap Anda.');
          setLoading(false);
          return;
        }
        if (!address.trim()) {
          setError('Mohon lengkapi alamat pengiriman rumah Anda.');
          setLoading(false);
          return;
        }
        loggedUser = await api.registerCustomer({
          name: name.trim(),
          phone: cleanPhone,
          password: password.trim(),
          address: address.trim(),
          note: note.trim() || undefined,
        });
      }

      localStorage.setItem('jogopawon_customer_user', JSON.stringify(loggedUser));
      localStorage.setItem('sayurgo_customer_user', JSON.stringify(loggedUser));
      try {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      } catch {
        // ignore if blocked
      }
      onSuccess(loggedUser);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal memproses, periksa nomor WhatsApp atau kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-100 relative max-h-[95vh] flex flex-col"
      >
        {/* Header Pattern */}
        <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white p-5 sm:p-6 relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white/90 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <img
              src="/logo.webp"
              alt="JogoPawon Logo"
              className="h-8 w-auto object-contain rounded-lg bg-white p-0.5 shadow-xs"
            />
            <span className="text-[10px] font-black tracking-widest uppercase bg-white/20 text-emerald-100 px-2 py-0.5 rounded-md">
              JogoPawon Mart
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-black leading-tight text-white">
            {mode === 'login' ? 'Masuk ke Akun Anda' : 'Daftar Akun Belanja Baru'}
          </h3>
          <p className="text-xs text-emerald-100 mt-1 leading-normal">
            {promptMessage ||
              (mode === 'login'
                ? 'Masuk untuk belanja PO sayur subuh, gunakan koin loyalitas, dan lacak pesanan.'
                : 'Daftar untuk menikmati belanja praktis, simpan alamat otomatis, dan raih hadiah koin!')}
          </p>

          {/* Value props banner */}
          <div className="flex items-center gap-2.5 mt-3 text-[11px] text-emerald-100 font-semibold flex-wrap">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              100% Produk Segar
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-300" />
              Koin Hadiah Tiap Belanja
            </span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex-1 py-3 text-xs font-bold transition-all text-center border-b-2 cursor-pointer ${
              mode === 'login'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Masuk Akun
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`flex-1 py-3 text-xs font-bold transition-all text-center border-b-2 cursor-pointer ${
              mode === 'register'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Daftar Baru
          </button>
        </div>

        {/* Body Form (Scrollable) */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {mode === 'register' && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/80 rounded-2xl p-3 flex items-center gap-2.5 text-amber-900 shadow-2xs">
              <div className="p-2 bg-amber-400 text-white rounded-xl shadow-xs shrink-0">
                <Gift className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-extrabold text-amber-950">Bonus Pengguna Baru! 🎁</p>
                <p className="text-[11px] text-amber-800">
                  Dapatkan <strong className="text-emerald-700">50 Koin Pawon</strong> gratis yang bisa langsung ditukarkan sembako!
                </p>
              </div>
            </div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 text-red-700 text-xs p-3 rounded-2xl border border-red-200 font-medium leading-relaxed"
            >
              ⚠️ {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Field: Nama Lengkap (Khusus Registrasi) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap / Nama Panggilan:
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ibu Siti Rahma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs bg-slate-50 text-slate-900 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Field: Nomor WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nomor WhatsApp:
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="Contoh: 081234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs bg-slate-50 text-slate-900 outline-none transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {mode === 'register'
                  ? 'Nomor WhatsApp aktif untuk konfirmasi kedatangan kurir subuh & struk belanja.'
                  : 'Gunakan nomor WhatsApp yang telah terdaftar.'}
              </p>
            </div>

            {/* Field: Kata Sandi / PIN */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {mode === 'register' ? 'Buat Kata Sandi / PIN Baru:' : 'Kata Sandi / PIN:'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={mode === 'register' ? 'Minimal 4 karakter (misal: 123456)' : 'Masukkan kata sandi Anda'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs bg-slate-50 text-slate-900 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Fields: Alamat & Catatan Pengiriman (Khusus Registrasi) */}
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alamat Lengkap Pengiriman:
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <textarea
                      required
                      rows={2}
                      placeholder="Jalan, No. Rumah, RT/RW, Dusun/Desa, Kecamatan..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs bg-slate-50 text-slate-900 outline-none resize-none transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Alamat otomatis terisi saat checkout, tidak perlu ketik ulang setiap hari.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Patokan Rumah / Catatan Kurir (Opsional):
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Pagar hijau seberang masjid / Belanjaan cantelkan di pagar"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 text-xs bg-slate-50 text-slate-900 outline-none transition-all"
                  />
                </div>
              </>
            )}

            {/* Submit Button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold py-3 px-4 rounded-2xl shadow-lg shadow-emerald-600/25 transition-all text-xs flex items-center justify-center gap-2 mt-3 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                'Memproses...'
              ) : mode === 'login' ? (
                <>
                  <span>Masuk Akun JogoPawon</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Daftar Sekarang & Ambil Bonus 50 Koin</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* Switch mode footer */}
          <div className="pt-2 border-t border-slate-100 text-center">
            {mode === 'login' ? (
              <p className="text-xs text-slate-500">
                Belum punya akun?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className="font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  Daftar di sini (+50 Koin Gratis)
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Sudah punya akun?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  Masuk di sini
                </button>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
