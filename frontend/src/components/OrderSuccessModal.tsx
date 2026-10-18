import React, { useState, useRef } from 'react';
import { Order } from '../types';
import {
  CheckCircle2,
  MessageCircle,
  ArrowRight,
  X,
  Clock,
  Truck,
  Coins,
  QrCode,
  CreditCard,
  Banknote,
  Copy,
  Check,
  UploadCloud,
  Loader2,
  AlertCircle,
  Download,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../services/api';

interface OrderSuccessModalProps {
  order: Order | null;
  onClose: () => void;
  onOpenTracking: (order: Order) => void;
  adminPhone?: string;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  onClose,
  onOpenTracking,
  adminPhone = '6289654190596',
}) => {
  if (!order) return null;

  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [proofUploaded, setProofUploaded] = useState(Boolean(order.payment_proof_url));
  const [proofUrl, setProofUrl] = useState(order.payment_proof_url || '');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatRupiah = (val: number) => 'Rp' + (val || 0).toLocaleString('id-ID');

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleProofFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Harap pilih file gambar bukti transfer (JPG, PNG, atau WEBP)');
      return;
    }
    setIsUploadingProof(true);
    try {
      const res = await api.uploadImage(file, 'jogopawon/payments');
      if (res && res.url) {
        setProofUrl(res.url);
        setProofUploaded(true);
        await api.uploadPaymentProof(order.id, res.url);
      } else {
        throw new Error('Gagal mendapatkan URL gambar dari server');
      }
    } catch (err: any) {
      console.error('Upload proof failed:', err);
      alert('Gagal mengunggah foto. Anda juga dapat langsung mengirimkan bukti bayar melalui WhatsApp toko.');
    } finally {
      setIsUploadingProof(false);
    }
  };

  const generateWhatsAppMessage = () => {
    const itemsList = order.items
      .map((it) => `• ${it.quantity}x ${it.product_name} (${it.unit}) - ${formatRupiah(it.subtotal)}`)
      .join('\n');

    if (order.payment_method === 'cod') {
      return encodeURIComponent(`Halo Admin JogoPawon Mart! Saya ingin konfirmasi pesanan COD saya:

📋 *No. Order*   : ${order.order_number}
👤 *Pemesan*     : ${order.customer_name} (${order.customer_phone})
📍 *Alamat*      : ${order.delivery_address}
📝 *Catatan*     : ${order.delivery_note || '-'}

🛒 *Daftar Belanja:*
${itemsList}

📦 *Jadwal Antar* : ${order.po_date} (${order.delivery_slot})
💰 *Subtotal*     : ${formatRupiah(order.subtotal)}
🚚 *Ongkos Kirim* : ${order.delivery_fee === 0 ? 'GRATIS (Promo)' : formatRupiah(order.delivery_fee)}
💵 *Total Tagihan*: *${formatRupiah(order.total_amount)}*
💳 *Metode Bayar* : *COD (BAYAR TUNAI DI TEMPAT)*

Saya sudah siapkan uang pas saat kurir datang besok subuh. Mohon diproses ya min, terima kasih! 🙏`);
    }

    const methodLabel = order.payment_method === 'qris' ? 'QRIS All Payment' : 'Transfer Bank';

    return encodeURIComponent(`Halo Admin JogoPawon Mart! Saya sudah melakukan pembayaran via ${methodLabel} untuk pesanan:

📋 *No. Order*   : ${order.order_number}
👤 *Pemesan*     : ${order.customer_name} (${order.customer_phone})
📍 *Alamat*      : ${order.delivery_address}

🛒 *Daftar Belanja:*
${itemsList}

📦 *Jadwal Antar* : ${order.po_date} (${order.delivery_slot})
💵 *Total Bayar*  : *${formatRupiah(order.total_amount)}*
💳 *Metode Bayar* : *${methodLabel.toUpperCase()}*
⏳ *Status*       : *Menunggu Verifikasi Admin*

Berikut saya lampirkan foto/screenshot bukti transfernya ya min. Mohon dicek dan di-ACC ya kak! Terima kasih 🙏`);
  };

  const handleSendWhatsApp = () => {
    const waUrl = `https://wa.me/${adminPhone}?text=${generateWhatsAppMessage()}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 260 }}
        className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl p-5 sm:p-6 text-center space-y-4 max-h-[92vh] overflow-y-auto border border-emerald-100 pointer-events-auto"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shadow-xs"
          aria-label="Tutup"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Success Icon */}
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
        </div>

        {/* Title & Order Number */}
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Pesanan Berhasil Dicatat
          </span>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 pt-1">
            Terima Kasih, {order.customer_name}!
          </h2>
          <p className="text-xs text-slate-500 font-mono font-bold">
            No. Order: <span className="text-emerald-700">{order.order_number}</span>
          </p>
        </div>

        {/* PAYMENT METHOD HIGHLIGHT SECTION */}
        {order.payment_method === 'cod' ? (
          /* COD SECTION */
          <div className="bg-sky-50 border border-sky-200/90 rounded-2xl p-3.5 text-left text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-sky-900 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-sky-600" />
                Metode: COD (Bayar Tunai di Tempat)
              </span>
              <span className="text-[10px] bg-sky-200/70 text-sky-900 font-bold px-2 py-0.5 rounded-full">
                Bayar ke Kurir
              </span>
            </div>
            <p className="text-[11px] text-sky-800 leading-relaxed">
              Anda tidak perlu transfer sekarang. Cukup siapkan uang tunai pas sebesar{' '}
              <strong className="font-black text-sky-950 text-xs">{formatRupiah(order.total_amount)}</strong>{' '}
              saat kurir subuh tiba di alamat Anda.
            </p>
          </div>
        ) : (
          /* QRIS SECTION */
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 text-left text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-amber-950 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-amber-600" />
                <span>Pembayaran QRIS Pasuruan</span>
              </span>
              <span className="text-[10px] bg-amber-200 text-amber-900 font-black px-2.5 py-0.5 rounded-full animate-pulse">
                Menunggu Pembayaran
              </span>
            </div>

            {/* Total to pay with copy button */}
            <div className="bg-white p-3 rounded-xl border border-amber-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block">Total yang Harus Dibayar:</span>
                <span className="text-base font-black text-amber-900">{formatRupiah(order.total_amount)}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(order.total_amount.toString(), 'nominal')}
                className="text-[11px] bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all"
              >
                {copiedText === 'nominal' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedText === 'nominal' ? 'Tersalin' : 'Salin Nominal'}
              </button>
            </div>

            {/* QRIS Barcode Box */}
            <div className="bg-white p-3.5 rounded-2xl border border-amber-200 text-center space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-amber-600" />
                  <span>Scan QRIS Resmi JogoPawon Sembako</span>
                </span>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  NMID: ID1026616559690
                </span>
              </div>

              <div className="relative max-w-[210px] mx-auto bg-white p-2.5 rounded-2xl border-2 border-dashed border-amber-300 shadow-inner flex flex-col items-center">
                <img
                  src="/qris_jogopawon.jpg"
                  alt="QRIS JogoPawon Sembako"
                  className="w-48 h-auto object-contain rounded-xl shadow-xs"
                />
                <div className="mt-2 w-full flex items-center justify-between text-[9px] text-slate-500 font-mono px-1">
                  <span className="font-semibold text-slate-700">JOGOPAWON, SEMBAKO</span>
                  <span className="font-bold text-amber-700">A01</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <a
                  href="/qris_jogopawon.jpg"
                  download="QRIS_JogoPawon_Sembako.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-amber-700" />
                  Unduh Barcode
                </a>
                <a
                  href="/qris_jogopawon.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Perbesar
                </a>
              </div>

              <p className="text-[10px] text-slate-500 leading-tight">
                Mendukung semua e-wallet & mobile banking:
                <br />
                <strong className="text-slate-700 font-semibold">BCA, BRI, Mandiri, BNI, GoPay, OVO, DANA, ShopeePay</strong>
              </p>
            </div>

            {/* PROOF OF PAYMENT UPLOAD & FEEDBACK */}
            <div className="pt-1 border-t border-amber-200/80 space-y-2">
              <span className="text-[11px] font-bold text-amber-950 block">
                Unggah Bukti Transfer di Sini (Atau Kirim via WhatsApp):
              </span>

              {proofUploaded ? (
                /* Feedback Success Alert */
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 space-y-1 text-emerald-950">
                  <div className="flex items-center gap-1.5 font-black text-emerald-800 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Bukti Transfer Diterima!</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Terima kasih! Bukti transfer Anda sudah masuk ke sistem. Admin JogoPawon sedang memverifikasi pembayaran Anda. Struk lunas akan otomatis diterbitkan begitu di-ACC!
                  </p>
                  {proofUrl && (
                    <div className="pt-1">
                      <a
                        href={proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-emerald-700 underline font-semibold"
                      >
                        Lihat Foto Bukti yang Diunggah ↗
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                /* Upload Button */
                <div className="flex gap-2 items-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleProofFileUpload(file);
                    }}
                  />
                  <button
                    type="button"
                    disabled={isUploadingProof}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-2xs"
                  >
                    {isUploadingProof ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Mengunggah...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5 text-amber-700" />
                        <span>Upload Screenshot Bukti Transfer</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Order Highlights */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-left text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              Jadwal Panen & Antar:
            </span>
            <span className="font-bold text-slate-900">{order.po_date}</span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              Slot Jam:
            </span>
            <span className="font-bold text-slate-900">{order.delivery_slot}</span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span>Metode Bayar:</span>
            <span className="font-bold text-slate-900 uppercase">{order.payment_method}</span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-200 font-black text-slate-900">
            <span>Total Pembayaran:</span>
            <span className="text-emerald-700 text-sm">{formatRupiah(order.total_amount)}</span>
          </div>

          {order.points_earned !== undefined && order.points_earned > 0 && (
            <div className="flex items-center justify-between pt-1.5 text-amber-900 font-bold bg-amber-50/90 p-2.5 rounded-xl border border-amber-200">
              <div>
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Coins className="w-3.5 h-3.5 fill-amber-400 text-amber-600 animate-bounce" />
                  <span>Koin Pawon (+{order.points_earned}):</span>
                </span>
                <span className="text-[10px] text-amber-800/80 font-medium block mt-0.5">
                  {order.payment_status === 'paid' || order.points_awarded
                    ? '✅ Telah masuk ke saldo akun Anda'
                    : '⏳ Otomatis masuk setelah pembayaran diverifikasi Lunas'}
                </span>
              </div>
              <span className="text-amber-800 font-black text-xs shrink-0">+{order.points_earned} Koin</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* WhatsApp Action Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleSendWhatsApp}
            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black py-3 px-4 rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 text-xs sm:text-sm transition-all cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>
              {order.payment_method === 'cod'
                ? 'Kirim Bill & Rincian Pesanan ke WA Toko'
                : 'Kirim Bukti Bayar ke WhatsApp Admin'}
            </span>
          </motion.button>

          {/* Live Tracking in Web */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenTracking(order);
            }}
            className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-2xl border border-slate-200 text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Lacak Status & Cek ACC Admin di Web</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
