import { digitsOnly, parseNominal } from './utils.js';

/**
 * @typedef {Object} InvoiceFormData
 * @property {string} nama
 * @property {string} idPelanggan
 * @property {string} nomorToken
 * @property {number} nominal
 * @property {number} harga
 * @property {string} [part]
 */

/**
 * @typedef {Object} FormValidationResult
 * @property {true} ok
 * @property {InvoiceFormData} data
 */

/**
 * @typedef {Object} FormValidationError
 * @property {false} ok
 * @property {Record<string, string>} errors
 */

/**
 * Read and validate invoice form fields.
 * @param {HTMLFormElement} form
 * @returns {FormValidationResult | FormValidationError}
 */
export function readAndValidateForm(form) {
  const fd = new FormData(form);
  const nama = String(fd.get('nama') ?? '').trim();
  const idPelangganRaw = String(fd.get('idPelanggan') ?? '').trim();
  const idPelanggan = idPelangganRaw.replace(/\s+/g, '');
  const nomorTokenRaw = String(fd.get('nomorToken') ?? '').trim();
  const nominalRaw = String(fd.get('nominal') ?? '').trim();
  const hargaRaw = String(fd.get('harga') ?? '').trim();
  const part = String(fd.get('part') ?? '').trim();

  /** @type {Record<string, string>} */
  const errors = {};

  if (nama.length < 2) {
    errors.nama = 'Nama pelanggan wajib diisi (minimal 2 karakter).';
  }

  if (!idPelanggan) {
    errors.idPelanggan = 'ID pelanggan wajib diisi.';
  } else if (!/^\d+$/.test(idPelanggan)) {
    errors.idPelanggan = 'ID pelanggan harus berupa angka.';
  } else if (idPelanggan.length < 11 || idPelanggan.length > 13) {
    errors.idPelanggan = 'ID pelanggan harus 11–13 digit.';
  }

  const tokenDigits = digitsOnly(nomorTokenRaw);
  if (!nomorTokenRaw) {
    errors.nomorToken = 'Nomor token wajib diisi.';
  } else if (tokenDigits.length < 1) {
    errors.nomorToken = 'Nomor token harus berisi angka.';
  }

  const nominal = parseNominal(nominalRaw);
  if (nominal == null) {
    errors.nominal = 'Nominal token wajib diisi dan harus lebih dari 0.';
  }

  const harga = parseNominal(hargaRaw);
  if (harga == null) {
    errors.harga = 'Harga wajib diisi dan harus lebih dari 0.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  /** @type {InvoiceFormData} */
  const data = {
    nama,
    idPelanggan,
    nomorToken: tokenDigits || nomorTokenRaw,
    nominal: /** @type {number} */ (nominal),
    harga: /** @type {number} */ (harga),
  };
  if (part) {
    data.part = part;
  }

  return { ok: true, data };
}

/**
 * Clear all field and form error messages in the form UI.
 * @param {HTMLFormElement} form
 * @param {HTMLElement | null} formErrorEl
 */
export function clearFormErrors(form, formErrorEl) {
  form.querySelectorAll('.field-error').forEach((el) => {
    el.hidden = true;
    el.textContent = '';
  });
  form.querySelectorAll('.field input.is-invalid').forEach((el) => {
    el.classList.remove('is-invalid');
  });
  if (formErrorEl) {
    formErrorEl.hidden = true;
    formErrorEl.textContent = '';
  }
}

/**
 * Show per-field validation errors.
 * @param {HTMLFormElement} form
 * @param {Record<string, string>} errors
 */
export function showFieldErrors(form, errors) {
  for (const [key, message] of Object.entries(errors)) {
    const input = form.querySelector(`#${CSS.escape(key)}`);
    const errorEl = form.querySelector(`#error-${CSS.escape(key)}`);
    if (input) input.classList.add('is-invalid');
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = message;
    }
  }
}
