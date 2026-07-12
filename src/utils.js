const BULAN_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/**
 * Format whole rupiah: 50000 → "Rp 50.000"
 * @param {number} amount
 * @returns {string}
 */
export function formatRp(amount) {
  const n = Math.trunc(Number(amount));
  if (!Number.isFinite(n)) return 'Rp 0';
  const digits = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return n < 0 ? `Rp -${digits}` : `Rp ${digits}`;
}

/**
 * Parse nominal input that may contain dots/spaces/Rp prefix.
 * @param {string} raw
 * @returns {number|null} positive integer or null if invalid
 */
export function parseNominal(raw) {
  if (raw == null) return null;
  const cleaned = String(raw)
    .trim()
    .replace(/rp/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '');
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

/**
 * Group digits every 4 for token display. Non-digit-only input returned trimmed.
 * @param {string} token
 * @returns {string}
 */
export function formatToken(token) {
  const trimmed = String(token ?? '').trim();
  const digits = trimmed.replace(/\s+/g, '');
  if (!/^\d+$/.test(digits)) return trimmed;
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

/**
 * Strip spaces from token for digit checks.
 * @param {string} token
 * @returns {string}
 */
export function digitsOnly(token) {
  return String(token ?? '').replace(/\D/g, '');
}

/**
 * Indonesian long date: 12 Juli 2026
 * @param {Date} [date]
 * @returns {string}
 */
export function formatTanggalId(date = new Date()) {
  const day = date.getDate();
  const month = BULAN_ID[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * YYYYMMDD for filenames
 * @param {Date} [date]
 * @returns {string}
 */
export function formatDateYmd(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Download filename per design.
 * @param {string} idPelanggan
 * @param {Date} [date]
 * @returns {string}
 */
export function makeDownloadFilename(idPelanggan, date = new Date()) {
  const id = String(idPelanggan).replace(/\D/g, '') || 'invoice';
  return `invoice-fansa-digital-${id}-${formatDateYmd(date)}.pdf`;
}

/**
 * Format number input with thousand separators (dots) while typing.
 * @param {string} raw
 * @returns {string}
 */
export function formatNominalInput(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
