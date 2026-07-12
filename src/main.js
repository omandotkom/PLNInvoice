import './styles.css';
import {
  clearFormErrors,
  readAndValidateForm,
  showFieldErrors,
} from './form.js';
import { formatNominalInput, makeDownloadFilename } from './utils.js';

/** @type {Blob | null} */
let lastBlob = null;
/** @type {string | null} */
let lastObjectUrl = null;
/** @type {string | null} */
let lastFilename = null;

const form = /** @type {HTMLFormElement} */ (document.getElementById('invoice-form'));
const btnGenerate = /** @type {HTMLButtonElement} */ (document.getElementById('btn-generate'));
const btnRedownload = /** @type {HTMLButtonElement} */ (document.getElementById('btn-redownload'));
const formError = /** @type {HTMLElement} */ (document.getElementById('form-error'));
const previewSection = /** @type {HTMLElement} */ (document.getElementById('preview-section'));
const previewFrame = /** @type {HTMLIFrameElement} */ (document.getElementById('preview-frame'));
const previewFilename = /** @type {HTMLElement} */ (document.getElementById('preview-filename'));
const nominalInput = /** @type {HTMLInputElement} */ (document.getElementById('nominal'));
const hargaInput = /** @type {HTMLInputElement} */ (document.getElementById('harga'));

function setGenerating(isGenerating) {
  btnGenerate.disabled = isGenerating;
  btnGenerate.textContent = isGenerating ? 'Membuat…' : 'Buat Invoice';
}

function revokePreviousUrl() {
  if (lastObjectUrl) {
    URL.revokeObjectURL(lastObjectUrl);
    lastObjectUrl = null;
  }
}

/**
 * @param {Blob} blob
 * @param {string} filename
 * @param {{ autoDownload?: boolean }} [opts]
 */
function presentPdf(blob, filename, opts = {}) {
  const { autoDownload = true } = opts;
  lastBlob = blob;
  lastFilename = filename;

  revokePreviousUrl();
  lastObjectUrl = URL.createObjectURL(blob);

  previewFrame.src = lastObjectUrl;
  previewFilename.textContent = filename;
  previewSection.hidden = false;
  btnRedownload.hidden = false;

  if (autoDownload) {
    triggerDownload(blob, filename);
  }
}

/**
 * @param {Blob} blob
 * @param {string} filename
 */
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function showFormError(message) {
  formError.hidden = false;
  formError.textContent = message;
}

/**
 * Live thousand-separator formatting for money inputs.
 * @param {HTMLInputElement} input
 */
function attachMoneyFormatter(input) {
  input.addEventListener('input', () => {
    const before = input.value;
    const formatted = formatNominalInput(before);
    if (formatted !== before) {
      input.value = formatted;
      const pos = formatted.length;
      input.setSelectionRange(pos, pos);
    }
  });
}

/**
 * @param {HTMLInputElement} input
 * @param {string} text
 * @param {boolean} isMoney
 */
function applyPastedValue(input, text, isMoney) {
  const cleaned = String(text ?? '').trim().replace(/\r?\n/g, ' ');
  input.value = isMoney ? formatNominalInput(cleaned) : cleaned;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
  const pos = input.value.length;
  input.setSelectionRange(pos, pos);
}

/**
 * @param {HTMLButtonElement} btn
 * @param {'success' | 'error'} state
 */
function flashPasteButton(btn, state) {
  btn.classList.remove('is-success', 'is-error');
  btn.classList.add(state === 'success' ? 'is-success' : 'is-error');
  window.setTimeout(() => {
    btn.classList.remove('is-success', 'is-error');
  }, 900);
}

/**
 * Read clipboard text (secure context + permission).
 * @returns {Promise<string>}
 */
async function readClipboardText() {
  if (navigator.clipboard?.readText) {
    return navigator.clipboard.readText();
  }
  throw new Error('Clipboard API tidak tersedia');
}

function setupPasteButtons() {
  form.querySelectorAll('.btn-paste').forEach((el) => {
    const btn = /** @type {HTMLButtonElement} */ (el);
    btn.addEventListener('click', async () => {
      const targetId = btn.getAttribute('data-paste-target');
      if (!targetId) return;
      const input = /** @type {HTMLInputElement | null} */ (
        document.getElementById(targetId)
      );
      if (!input) return;

      const isMoney = btn.getAttribute('data-money') === 'true';

      try {
        const text = await readClipboardText();
        if (!text || !String(text).trim()) {
          flashPasteButton(btn, 'error');
          showFormError('Clipboard kosong. Salin teks dulu, lalu tempel.');
          return;
        }
        formError.hidden = true;
        formError.textContent = '';
        applyPastedValue(input, text, isMoney);
        flashPasteButton(btn, 'success');
      } catch (err) {
        console.error(err);
        flashPasteButton(btn, 'error');
        showFormError(
          'Tidak bisa membaca clipboard. Izinkan akses clipboard di browser, atau tempel manual (Ctrl+V).'
        );
        input.focus();
      }
    });
  });
}

/**
 * Apply money value to input and keep chip highlight in sync.
 * @param {HTMLInputElement} input
 * @param {number|string} value
 */
function setMoneyInputValue(input, value) {
  input.value = formatNominalInput(String(value));
  input.dispatchEvent(new Event('input', { bubbles: true }));
  syncChipActiveState(input.id);
}

/**
 * Highlight chip that matches current input amount (digits only).
 * @param {string} inputId
 */
function syncChipActiveState(inputId) {
  const row = form.querySelector(`.chip-row[data-chip-for="${CSS.escape(inputId)}"]`);
  if (!row) return;
  const input = /** @type {HTMLInputElement | null} */ (document.getElementById(inputId));
  if (!input) return;
  const current = input.value.replace(/\D/g, '');
  row.querySelectorAll('.chip').forEach((el) => {
    const chip = /** @type {HTMLButtonElement} */ (el);
    const v = chip.getAttribute('data-value') ?? '';
    chip.classList.toggle('is-active', v === current && current !== '');
  });
}

function setupMoneyChips() {
  form.querySelectorAll('.chip-row').forEach((row) => {
    const targetId = row.getAttribute('data-chip-for');
    if (!targetId) return;
    const input = /** @type {HTMLInputElement | null} */ (document.getElementById(targetId));
    if (!input) return;

    row.querySelectorAll('.chip').forEach((el) => {
      const chip = /** @type {HTMLButtonElement} */ (el);
      chip.addEventListener('click', () => {
        const value = chip.getAttribute('data-value');
        if (!value) return;
        setMoneyInputValue(input, value);
        input.focus();
      });
    });

    input.addEventListener('input', () => syncChipActiveState(targetId));
    syncChipActiveState(targetId);
  });
}

attachMoneyFormatter(nominalInput);
attachMoneyFormatter(hargaInput);
setupPasteButtons();
setupMoneyChips();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearFormErrors(form, formError);

  const result = readAndValidateForm(form);
  if (!result.ok) {
    showFieldErrors(form, result.errors);
    return;
  }

  const now = new Date();
  const filename = makeDownloadFilename(result.data.idPelanggan, now);

  setGenerating(true);
  try {
    const { generateInvoicePdfBlob } = await import('./invoice-pdf.js');
    const blob = await generateInvoicePdfBlob({
      ...result.data,
      tanggal: now,
    });
    presentPdf(blob, filename, { autoDownload: true });
  } catch (err) {
    console.error(err);
    showFormError('Gagal membuat PDF. Silakan coba lagi.');
  } finally {
    setGenerating(false);
  }
});

btnRedownload.addEventListener('click', () => {
  if (!lastBlob || !lastFilename) return;
  triggerDownload(lastBlob, lastFilename);
});

window.addEventListener('beforeunload', () => {
  revokePreviousUrl();
});
