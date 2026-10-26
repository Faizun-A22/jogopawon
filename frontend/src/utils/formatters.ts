/**
 * Utility Formatting Angka & Rupiah Indonesia
 * Memastikan selalu ada pemisah ribuan titik (.) setiap tiga angka (.000.000)
 */

export function formatRupiah(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return 'Rp 0';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return 'Rp 0';
  const rounded = Math.round(num);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp ${formatted}`;
}

export function formatNumberDots(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '0';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '0';
  const rounded = Math.round(num);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
