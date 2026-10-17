import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import {
  ArrowLeft,
  User as UserIcon,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Truck,
  Sparkles,
  Gift,
} from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  onBack: () => void;
  onSuccess: (user: User) => void;
  promptMessage?: string;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  onBack,
  onSuccess,
  promptMessage,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizePhone = (p: string) => {
    let clean = p.replace(/\D/g, '');
    if (clean.startsWith('62')) {
      clean = '0' + clean.slice(2);
    } else if (clean.startsWith('8')) {
      clean = '0' + clean;
    }
    return clean;
  };

  const isPasswordMismatch =
    mode === 'register' &&
    confirmPassword.length > 0 &&
    password !== confirmPassword;

  const isPasswordMatch =
    mode === 'register' &&
    password.length >= 4 &&
    confirmPassword.length >= 4 &&
    password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanPhone = normalizePhone(phone);

    if (cleanPhone.length < 9) {
      setError('Nomor WhatsApp tidak valid (minimal 9 digit, contoh: 081234567890).');
      return;
    }

    if (password.trim().length < 4) {
      setError('Kata sandi / PIN minimal 4 karakter.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Mohon isi nama lengkap atau nama panggilan Anda.');
        return;
      }
      if (password.trim() !== confirmPassword.trim()) {
        setError('Konfirmasi kata sandi tidak cocok. Mohon pastikan kedua kata sandi sama.');
        return;
      }
    }

    setLoading(true);
    try {
      let loggedUser: User;
      if (mode === 'login') {
        loggedUser = await api.loginCustomer(cleanPhone, password.trim());
      } else {
        loggedUser = await api.registerCustomer({
          name: name.trim(),
          phone: cleanPhone,
          email: email.trim() || undefined,
          password: password.trim(),
          referral_code: referralCode.trim() ? referralCode.trim().toUpperCase() : undefined,
        });
      }

      localStorage.setItem('jogopawon_customer_user', JSON.stringify(loggedUser));
      localStorage.setItem('sayurgo_customer_user', JSON.stringify(loggedUser));
      try {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
      onSuccess(loggedUser);
    } catch (err: any) {
      setError(err?.message || 'Gagal memproses, periksa nomor WhatsApp atau kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation Bar */}
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

          <div
            onClick={onBack}
            className="flex items-center gap-2 cursor-pointer"
          >
            <img src="/logo.webp" alt="Logo" className="h-8 w-auto object-contain rounded" />
            <span className="font-black text-sm sm:text-base text-emerald-950">
              Jogo<span className="text-emerald-700">Pawon</span>
              <span className="ml-1 text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
                MART
              </span>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Aman & Terpercaya</span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
        >
          {/* Hero Banner Header */}
          <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white p-6 sm:p-8 relative">
            <div className="relative z-10">
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 text-emerald-100 px-2.5 py-1 rounded-full inline-block mb-3">
                {mode === 'login' ? '🔐 Akses Pelanggan' : '✨ Pendaftaran Akun Pelanggan'}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {mode === 'login' ? 'Masuk ke Akun JogoPawon' : 'Daftar Akun Belanja Sayur'}
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100 mt-2 leading-relaxed">
                {promptMessage ||
                  (mode === 'login'
                    ? 'Masuk untuk belanja PO sayur subuh dan pantau status pesanan langsung ke rumah Anda.'
                    : 'Daftar sekarang untuk kemudahan belanja sayur segar dengan pengantaran subuh ke rumah Anda.')}
              </p>

              <div className="flex items-center gap-3 mt-4 text-[11px] text-emerald-100 font-medium flex-wrap">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> 100% Sayur Segar
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-emerald-300" /> Pengantaran Subuh
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Garansi Ganti Baru
                </span>
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 bg-slate-100/80 p-1.5 border-b border-slate-100">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`py-3 text-xs sm:text-sm font-black rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                mode === 'login'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>Masuk Akun</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`py-3 text-xs sm:text-sm font-black rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                mode === 'register'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Daftar Baru</span>
            </button>
          </div>

          {/* Form Container */}
          <div className="p-6 sm:p-8 space-y-5">
            {error && (
              <div className="bg-red-50 text-red-700 text-xs p-3.5 rounded-2xl border border-red-200 font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Field Khusus Registrasi: Nama Lengkap */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    Nama Lengkap / Nama Panggilan:
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Ibu Siti Rahma / Bpk. Budi"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-3 rounded-2xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm bg-slate-50 focus:bg-white text-slate-900 outline-none transition-all font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Field: Nomor WhatsApp */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  Nomor WhatsApp:
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 081234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 rounded-2xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm bg-slate-50 focus:bg-white text-slate-900 outline-none transition-all font-medium"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {mode === 'register'
                    ? 'Nomor WhatsApp aktif digunakan untuk konfirmasi pengantaran subuh & struk belanja lunas.'
                    : 'Gunakan nomor WhatsApp yang telah Anda daftarkan.'}
                </p>
              </div>

              {/* Field Khusus Registrasi: Email (Opsional) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    Email <span className="text-slate-400 font-normal">(Opsional)</span>:
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="Contoh: ibu.siti@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-3 rounded-2xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm bg-slate-50 focus:bg-white text-slate-900 outline-none transition-all font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Field: Kata Sandi / PIN */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {mode === 'register' ? 'Buat Kata Sandi / PIN Baru:' : 'Kata Sandi / PIN:'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder={
                      mode === 'register'
                        ? 'Minimal 4 karakter (misal: 123456)'
                        : 'Masukkan kata sandi akun Anda'
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-3 rounded-2xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm bg-slate-50 focus:bg-white text-slate-900 outline-none transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Field Khusus Registrasi: Konfirmasi Kata Sandi (Harus Sama) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    Ulangi Kata Sandi Baru:
                  </label>
                  <div className="relative">
                    <Lock
                      className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                        isPasswordMismatch
                          ? 'text-red-500'
                          : isPasswordMatch
                          ? 'text-emerald-500'
                          : 'text-slate-400'
                      }`}
                    />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Masukkan kembali kata sandi di atas"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full pl-10 pr-11 py-3 rounded-2xl border text-xs sm:text-sm outline-none transition-all font-medium ${
                        isPasswordMismatch
                          ? 'border-red-400 bg-red-50/40 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                          : isPasswordMatch
                          ? 'border-emerald-400 bg-emerald-50/30 text-emerald-950 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                          : 'border-slate-200 bg-slate-50 focus:bg-white text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Peringatan jika kata sandi belum sama */}
                  {isPasswordMismatch && (
                    <p className="text-[11px] text-red-600 font-bold mt-1.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span>Kata sandi tidak sama. Mohon pastikan kedua kata sandi sama persis.</span>
                    </p>
                  )}
                  {isPasswordMatch && (
                    <p className="text-[11px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Kata sandi cocok!</span>
                    </p>
                  )}
                </div>
              )}

              {/* Field Khusus Registrasi: Kode Referral Pengundang (Opsional) */}
              {mode === 'register' && (
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-emerald-950">
                      Kode Referral Teman / Pengundang:
                    </label>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded-full">
                      Opsional (7 Karakter)
                    </span>
                  </div>
                  <div className="relative">
                    <Gift className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="Contoh: 7K9X2MN"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-emerald-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm font-mono font-bold tracking-wider bg-white text-emerald-950 uppercase outline-none transition-all placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400"
                    />
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-tight">
                    💡 Punya kode ajakan dari ibu-ibu / teman? Masukkan di sini agar akun Anda otomatis tertaut dan berbagi berkah koin.
                  </p>
                </div>
              )}

              {/* Action Button */}
              <button
                type="submit"
                disabled={loading || (mode === 'register' && isPasswordMismatch)}
                className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 text-xs sm:text-sm transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span>Sedang memproses...</span>
                ) : mode === 'login' ? (
                  <>
                    <span>Masuk Akun JogoPawon</span>
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </>
                ) : (
                  <>
                    <span>Daftar Akun JogoPawon</span>
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                  </>
                )}
              </button>
            </form>

            {/* Switch Mode Prompt */}
            <div className="pt-4 border-t border-slate-100 text-center">
              {mode === 'login' ? (
                <p className="text-xs text-slate-600">
                  Belum punya akun belanja?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError('');
                    }}
                    className="font-black text-emerald-700 hover:underline cursor-pointer"
                  >
                    Daftar Akun Baru di sini
                  </button>
                </p>
              ) : (
                <p className="text-xs text-slate-600">
                  Sudah memiliki akun?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                    }}
                    className="font-black text-emerald-700 hover:underline cursor-pointer"
                  >
                    Masuk ke Akun Anda
                  </button>
                </p>
              )}
            </div>

            {/* WhatsApp Admin Help */}
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                Butuh bantuan / lupa sandi?
              </span>
              <a
                href="https://wa.me/6289654190596?text=Halo%20Admin%20JogoPawon,%20saya%20butuh%20bantuan%20login%20atau%20pendaftaran%20akun."
                target="_blank"
                rel="noreferrer"
                className="font-bold text-emerald-700 hover:underline"
              >
                Chat Admin WA ↗
              </a>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};
