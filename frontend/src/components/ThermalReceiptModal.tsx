import React, { useRef, useState } from 'react';
import { Order } from '../types';
import { X, Printer, Download, CheckCircle2, Clock, Share2, Copy, Check } from 'lucide-react';

interface ThermalReceiptModalProps {
  order: Order | null;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({ order, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  if (!order) return null;

  const isPaid = order.payment_status === 'paid';
  const formatRupiah = (val: number | string) => { const num = typeof val === 'string' ? parseFloat(val) : val; return 'Rp ' + Math.round(num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = () => {
    setIsGeneratingImg(true);
    try {
      const node = receiptRef.current;
      if (!node) return;

      // Buat canvas manual dengan rendering teks struk kasir beresolusi tinggi (crisp thermal receipt image)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = 420;
      // Perkirakan tinggi struk berdasarkan item
      const baseHeight = 560;
      const itemsHeight = (order.items || []).length * 48;
      const height = baseHeight + itemsHeight;

      canvas.width = width * 2; // retina 2x
      canvas.height = height * 2;
      ctx.scale(2, 2);

      // Background kertas struk thermal putih bersih
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle paper shadow border
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, width, height);

      let y = 35;

      // Header Toko
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px "Courier New", Courier, monospace';
      ctx.fillText('🥬 JOGOPAWON MART', width / 2, y);

      y += 18;
      ctx.font = 'bold 11px "Courier New", Courier, monospace';
      ctx.fillStyle = '#334155';
      ctx.fillText('PASAR & DAPUR SEGAR SUBUH', width / 2, y);

      y += 16;
      ctx.font = '10px "Courier New", Courier, monospace';
      ctx.fillStyle = '#64748B';
      ctx.fillText('Jl. Raya Pasuruan No.KM.10, Gambiran,', width / 2, y);
      y += 14;
      ctx.fillText('Gambirkuning, Kraton, Pasuruan, Jatim 67151', width / 2, y);
      y += 14;
      ctx.fillText('WA: 0896-5419-0596', width / 2, y);

      y += 16;
      // Dashed Line
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#94A3B8';
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();

      y += 20;
      // Status Badge Banner
      ctx.setLineDash([]);
      if (isPaid) {
        ctx.fillStyle = '#ECFDF5';
        ctx.fillRect(20, y - 14, width - 40, 28);
        ctx.strokeStyle = '#10B981';
        ctx.strokeRect(20, y - 14, width - 40, 28);
        ctx.fillStyle = '#047857';
        ctx.font = 'bold 13px "Courier New", Courier, monospace';
        ctx.fillText('*** LUNAS / SUDAH SELESAI ***', width / 2, y + 4);
      } else {
        ctx.fillStyle = '#FFFBEB';
        ctx.fillRect(20, y - 14, width - 40, 28);
        ctx.strokeStyle = '#F59E0B';
        ctx.strokeRect(20, y - 14, width - 40, 28);
        ctx.fillStyle = '#B45309';
        ctx.font = 'bold 13px "Courier New", Courier, monospace';
        ctx.fillText('*** BELUM LUNAS / TAGIH PEMBAYARAN ***', width / 2, y + 4);
      }

      y += 28;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();

      y += 18;
      // Info Pesanan
      ctx.textAlign = 'left';
      ctx.font = '11px "Courier New", Courier, monospace';
      ctx.fillStyle = '#1E293B';
      ctx.fillText(`No. Struk : #${order.order_number}`, 24, y);
      y += 15;
      const orderDate = order.created_at ? new Date(order.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Hari ini';
      ctx.fillText(`Waktu     : ${orderDate}`, 24, y);
      y += 15;
      ctx.fillText(`Pelanggan : ${order.customer_name}`, 24, y);
      y += 15;
      ctx.fillText(`No. WA    : ${order.customer_phone}`, 24, y);
      y += 15;
      ctx.fillText(`Kirim Ke  : ${(order.delivery_address || '-').slice(0, 38)}`, 24, y);
      if ((order.delivery_address || '').length > 38) {
        y += 13;
        ctx.fillText(`            ${(order.delivery_address || '').slice(38, 76)}`, 24, y);
      }
      y += 15;
      ctx.fillText(`Jadwal PO : ${order.po_date || 'Besok Subuh'} (${order.delivery_slot})`, 24, y);

      y += 16;
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();

      y += 16;
      // Header Kolom Barang
      ctx.font = 'bold 10px "Courier New", Courier, monospace';
      ctx.fillStyle = '#475569';
      ctx.fillText('ITEM', 24, y);
      ctx.textAlign = 'right';
      ctx.fillText('SUBTOTAL', width - 24, y);

      y += 8;
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();

      // Daftar Items
      y += 16;
      ctx.font = '11px "Courier New", Courier, monospace';
      (order.items || []).forEach((it) => {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0F172A';
        const name = it.product_name.length > 24 ? it.product_name.slice(0, 24) + '..' : it.product_name;
        ctx.fillText(name, 24, y);

        ctx.textAlign = 'right';
        ctx.fillText(`Rp ${formatRupiah(it.subtotal)}`, width - 24, y);

        y += 14;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#64748B';
        ctx.font = '10px "Courier New", Courier, monospace';
        const variantText = it.variant_name ? `(${it.variant_name})` : '';
        ctx.fillText(`  ${it.quantity} x Rp ${formatRupiah(it.price)} /${it.unit} ${variantText}`, 24, y);

        y += 16;
        ctx.font = '11px "Courier New", Courier, monospace';
      });

      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();

      y += 18;
      // Rincian Pembayaran
      ctx.textAlign = 'left';
      ctx.fillStyle = '#334155';
      ctx.fillText('Subtotal Belanja', 24, y);
      ctx.textAlign = 'right';
      ctx.fillText(`Rp ${formatRupiah(order.subtotal)}`, width - 24, y);

      y += 15;
      ctx.textAlign = 'left';
      ctx.fillText('Ongkos Kirim Kurir', 24, y);
      ctx.textAlign = 'right';
      ctx.fillText(order.delivery_fee === 0 ? 'GRATIS' : `Rp ${formatRupiah(order.delivery_fee)}`, width - 24, y);

      if (order.discount && order.discount > 0) {
        y += 15;
        ctx.textAlign = 'left';
        ctx.fillText('Diskon Promo', 24, y);
        ctx.textAlign = 'right';
        ctx.fillText(`-Rp ${formatRupiah(order.discount)}`, width - 24, y);
      }

      y += 12;
      ctx.setLineDash([]);
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();

      y += 20;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 15px "Courier New", Courier, monospace';
      ctx.fillText('TOTAL TAGIHAN', 24, y);
      ctx.textAlign = 'right';
      ctx.fillText(`Rp ${formatRupiah(order.total_amount)}`, width - 24, y);

      y += 16;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#94A3B8';
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();

      y += 16;
      ctx.textAlign = 'left';
      ctx.font = '11px "Courier New", Courier, monospace';
      ctx.fillStyle = '#334155';
      ctx.fillText(`Metode Bayar: ${order.payment_method.toUpperCase()}`, 24, y);
      y += 14;
      ctx.fillText(`Status Bayar: ${isPaid ? 'LUNAS TERVERIFIKASI' : (order.payment_method === 'cod' ? 'COD (BAYAR SAAT TIBA)' : 'MENUNGGU PEMBAYARAN')}`, 24, y);
      if (order.points_earned && order.points_earned > 0) {
        y += 14;
        ctx.fillText(`Koin Didapat: +${order.points_earned} Koin Pawon`, 24, y);
      }

      y += 24;
      // Footer Salam Toko
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px "Courier New", Courier, monospace';
      ctx.fillStyle = '#0F172A';
      ctx.fillText('TERIMA KASIH TELAH BERBELANJA!', width / 2, y);
      y += 14;
      ctx.font = '10px "Courier New", Courier, monospace';
      ctx.fillStyle = '#64748B';
      ctx.fillText('Sayur Segar Petik Subuh Pasuruan', width / 2, y);
      y += 13;
      ctx.fillText('Simpan struk ini sebagai bukti resmi', width / 2, y);

      // Trigger download
      const imageURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Struk-JogoPawon-${order.order_number}-${isPaid ? 'LUNAS' : 'TAGIHAN'}.png`;
      link.href = imageURL;
      link.click();
    } catch (e) {
      console.warn('Gagal render canvas struk:', e);
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const handleCopyText = () => {
    const lines = [
      '================================',
      '🥬 JOGOPAWON MART',
      'Pasar & Dapur Segar Subuh',
      'Jl. Raya Pasuruan No.KM.10, Gambiran, Gambirkuning, Kraton, Pasuruan, Jatim 67151',
      'WA: 0896-5419-0596',
      '================================',
      `STATUS: ${isPaid ? '✓ LUNAS (TERVERIFIKASI)' : '⏳ BELUM LUNAS (TAGIH PEMBAYARAN)'}`,
      '--------------------------------',
      `No. Pesanan : #${order.order_number}`,
      `Pelanggan   : ${order.customer_name} (${order.customer_phone})`,
      `Alamat      : ${order.delivery_address}`,
      `Jadwal Antar: ${order.po_date || 'Besok Subuh'} (${order.delivery_slot})`,
      '--------------------------------',
      ...(order.items || []).map((it) => `${it.quantity}x ${it.product_name} = Rp ${formatRupiah(it.subtotal)}`),
      '--------------------------------',
      `Subtotal   : Rp ${formatRupiah(order.subtotal)}`,
      `Ongkir     : ${order.delivery_fee === 0 ? 'GRATIS' : `Rp ${formatRupiah(order.delivery_fee)}`}`,
      `TOTAL      : Rp ${formatRupiah(order.total_amount)}`,
      `Metode     : ${order.payment_method.toUpperCase()}`,
      '================================',
      'Terima Kasih Atas Pesanan Anda!',
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 rounded-3xl p-4 sm:p-6 max-w-md w-full shadow-2xl space-y-4 my-auto border border-slate-700">
        {/* Header Modal Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-white">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧾</span>
            <div>
              <h3 className="font-black text-sm sm:text-base">Struk Kasir Digital JogoPawon</h3>
              <p className="text-[11px] text-slate-400">Siap Cetak Thermal / Unduh Gambar PNG</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Mode Switcher Pills */}
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-slate-400 font-bold">Model Struk:</span>
          <span
            className={`px-3 py-1 rounded-full font-black text-xs flex items-center gap-1.5 shadow-sm ${
              isPaid
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            }`}
          >
            {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            {isPaid ? 'Model: SUDAH PELUNASAN' : 'Model: BELUM PELUNASAN'}
          </span>
        </div>

        {/* Paper Receipt Visual Container */}
        <div className="max-h-[60vh] overflow-y-auto rounded-2xl p-1 bg-slate-950 border border-slate-800 shadow-inner">
          <div
            ref={receiptRef}
            id="jogopawon-thermal-receipt"
            className="bg-white text-slate-900 p-5 rounded-xl shadow-md font-mono text-xs space-y-3 relative overflow-hidden select-all"
            style={{ fontFamily: '"Courier New", Courier, monospace' }}
          >
            {/* Top jagged paper receipt effect */}
            <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-slate-300">
              <h4 className="font-black text-base tracking-wider text-slate-900">
                🥬 JOGOPAWON MART
              </h4>
              <p className="text-[10px] font-black tracking-widest text-slate-700 uppercase">
                Pasar & Dapur Segar Subuh
              </p>
              <p className="text-[9.5px] text-slate-600 leading-tight">
                Jl. Raya Pasuruan No.KM.10, Gambiran,<br />
                Gambirkuning, Kraton, Pasuruan, Jatim 67151
              </p>
              <p className="text-[10px] text-slate-500 font-bold">
                WhatsApp: 0896-5419-0596
              </p>
            </div>

            {/* STATUS PELUNASAN BADGE BANNER */}
            <div
              className={`py-2 px-3 rounded-lg text-center font-black tracking-wider text-xs border ${
                isPaid
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-400'
                  : 'bg-amber-50 text-amber-950 border-amber-400'
              }`}
            >
              {isPaid ? (
                <div className="flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>*** SUDAH PELUNASAN (LUNAS) ***</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>*** BELUM PELUNASAN (TAGIHAN) ***</span>
                </div>
              )}
            </div>

            {/* Order Metadata */}
            <div className="space-y-1 text-[11px] text-slate-800 pb-2 border-b-2 border-dashed border-slate-300">
              <div className="flex justify-between">
                <span>No. Pesanan:</span>
                <strong className="font-bold">#{order.order_number}</strong>
              </div>
              <div className="flex justify-between">
                <span>Waktu Order:</span>
                <span>
                  {order.created_at
                    ? new Date(order.created_at).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'Hari ini'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan:</span>
                <span className="font-bold">{order.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span>No. WA:</span>
                <span>{order.customer_phone}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Alamat Pengantaran:</span>
                <span className="font-bold text-[10.5px] leading-tight block">
                  {order.delivery_address || '-'}
                </span>
              </div>
              {order.delivery_note && (
                <div className="text-[10px] text-slate-500 italic">
                  Catatan: "{order.delivery_note}"
                </div>
              )}
              <div className="flex justify-between pt-1">
                <span>Jadwal Antar:</span>
                <span className="font-bold text-emerald-800">
                  {order.po_date || 'Besok Subuh'} ({order.delivery_slot})
                </span>
              </div>
              {order.courier_name && (
                <div className="flex justify-between">
                  <span>Kurir Subuh:</span>
                  <span className="font-bold">{order.courier_name}</span>
                </div>
              )}
            </div>

            {/* Items Header */}
            <div>
              <div className="flex justify-between text-[10px] font-black text-slate-500 border-b border-dashed border-slate-300 pb-1 uppercase">
                <span>Nama Item</span>
                <span>Subtotal</span>
              </div>

              {/* Items List */}
              <div className="divide-y divide-dashed divide-slate-200 py-1 space-y-1">
                {(order.items || []).map((it, idx) => (
                  <div key={idx} className="pt-1.5 text-[11px]">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span className="truncate pr-2">{it.product_name}</span>
                      <span className="shrink-0">Rp {formatRupiah(it.subtotal)}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 flex justify-between">
                      <span>
                        {it.quantity} x Rp {formatRupiah(it.price)} /{it.unit}
                        {it.variant_name ? ` (${it.variant_name})` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Calculation Summary */}
            <div className="border-t-2 border-dashed border-slate-300 pt-2 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Belanja:</span>
                <span>Rp {formatRupiah(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Ongkir Kurir Subuh:</span>
                <span>
                  {order.delivery_fee === 0 ? 'GRATIS' : `Rp ${formatRupiah(order.delivery_fee)}`}
                </span>
              </div>
              {order.discount && order.discount > 0 ? (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Diskon Promo:</span>
                  <span>-Rp {formatRupiah(order.discount)}</span>
                </div>
              ) : null}

              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t-2 border-slate-900">
                <span>TOTAL TAGIHAN:</span>
                <span>Rp {formatRupiah(order.total_amount)}</span>
              </div>

              <div className="pt-2 text-[10px] text-slate-600 space-y-0.5 border-t border-dashed border-slate-200">
                <div className="flex justify-between">
                  <span>Metode Pembayaran:</span>
                  <span className="font-bold">{order.payment_method.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status Pembayaran:</span>
                  <span className={`font-black ${isPaid ? 'text-emerald-700' : 'text-amber-800'}`}>
                    {isPaid ? 'LUNAS (VERIFIKASI ADMIN)' : order.payment_method === 'cod' ? 'COD (BAYAR SAAT TIBA)' : 'MENUNGGU PEMBAYARAN'}
                  </span>
                </div>
                {order.points_earned !== undefined && order.points_earned > 0 && (
                  <div className="flex justify-between text-amber-800 font-bold">
                    <span>Bonus Koin Belanja:</span>
                    <span>+{order.points_earned} Koin Pawon</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Footer Note */}
            <div className="text-center pt-3 border-t-2 border-dashed border-slate-300 text-[10px] text-slate-500 space-y-0.5">
              <p className="font-black text-slate-800 uppercase tracking-wider">
                MATUR NUWUN / TERIMA KASIH!
              </p>
              <p>Sayur Segar Pasuruan Petik Subuh</p>
              <p className="text-[9px] text-slate-400">Simpan bukti struk ini untuk penukaran hadiah koin</p>
            </div>
          </div>
        </div>

        {/* Action Button Controls */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={isGeneratingImg}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isGeneratingImg ? 'Proses...' : 'Unduh Gambar'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-700"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Cetak Thermal</span>
          </button>

          <button
            type="button"
            onClick={handleCopyText}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-700"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-300" />}
            <span>{isCopied ? 'Tersalin!' : 'Salin Teks'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
