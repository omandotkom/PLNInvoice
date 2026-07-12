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
const btnReset = /** @type {HTMLButtonElement} */ (document.getElementById('btn-reset'));
const formError = /** @type {HTMLElement} */ (document.getElementById('form-error'));
const previewSection = /** @type {HTMLElement} */ (document.getElementById('preview-section'));
const previewFrameWrap = /** @type {HTMLButtonElement} */ (
  document.getElementById('preview-frame-wrap')
);
const previewFrame = /** @type {HTMLIFrameElement} */ (document.getElementById('preview-frame'));
const previewImage = /** @type {HTMLImageElement} */ (document.getElementById('preview-image'));
const previewFilename = /** @type {HTMLElement} */ (document.getElementById('preview-filename'));
const previewHint = /** @type {HTMLElement} */ (document.getElementById('preview-hint'));
const previewZoomBadge = /** @type {HTMLElement} */ (document.getElementById('preview-zoom-badge'));
const lightbox = /** @type {HTMLElement} */ (document.getElementById('invoice-lightbox'));
const lightboxImage = /** @type {HTMLImageElement} */ (document.getElementById('lightbox-image'));
const lightboxClose = /** @type {HTMLButtonElement} */ (document.getElementById('lightbox-close'));
const nominalInput = /** @type {HTMLInputElement} */ (document.getElementById('nominal'));
const hargaInput = /** @type {HTMLInputElement} */ (document.getElementById('harga'));

const PREVIEW_HINT_EMPTY =
  'Isi form lalu klik Buat Invoice. Setelah jadi, klik preview untuk layar penuh.';
const PREVIEW_HINT_READY =
  'Klik preview untuk membuka invoice layar penuh (siap screenshot).';

/** @type {string | null} */
let lastPreviewImageUrl = null;

function setGenerating(isGenerating) {
  btnGenerate.disabled = isGenerating;
  btnGenerate.textContent = isGenerating ? 'Membuat…' : 'Buat Invoice';
}

function revokePreviousUrl() {
  if (lastObjectUrl) {
    URL.revokeObjectURL(lastObjectUrl);
    lastObjectUrl = null;
  }
  if (lastPreviewImageUrl) {
    URL.revokeObjectURL(lastPreviewImageUrl);
    lastPreviewImageUrl = null;
  }
}

/**
 * Render halaman 1 PDF ke gambar penuh (A4) agar mudah di-screenshot.
 * @param {Blob} blob
 * @returns {Promise<boolean>} true if canvas/image preview succeeded
 */
async function renderFullPagePreview(blob) {
  try {
    const pdfjs = await import('pdfjs-dist');
    const workerSrc = (
      await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    ).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

    const data = new Uint8Array(await blob.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data }).promise;
    const page = await pdf.getPage(1);

    // High-res for fullscreen lightbox + sharp preview (≈ 2× largest screen edge)
    const targetCssWidth = Math.max(
      window.innerWidth || 794,
      window.innerHeight || 794,
      1000
    );
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = (targetCssWidth * 2) / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return false;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
      // @ts-expect-error pdfjs types vary by version
      canvas,
    }).promise;

    const imageBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
        'image/png'
      );
    });

    if (lastPreviewImageUrl) {
      URL.revokeObjectURL(lastPreviewImageUrl);
    }
    lastPreviewImageUrl = URL.createObjectURL(imageBlob);

    previewImage.src = lastPreviewImageUrl;
    previewImage.hidden = false;
    previewFrame.hidden = true;
    previewFrame.removeAttribute('src');
    lightboxImage.src = lastPreviewImageUrl;
    return true;
  } catch (err) {
    console.warn('Full-page image preview failed, falling back to iframe', err);
    return false;
  }
}

function openLightbox() {
  if (!lastPreviewImageUrl && !previewImage.src) return;
  if (lastPreviewImageUrl) {
    lightboxImage.src = lastPreviewImageUrl;
  } else if (previewImage.src) {
    lightboxImage.src = previewImage.src;
  }
  lightbox.hidden = false;
  document.body.classList.add('lightbox-open');
  lightboxClose.focus();

  // Browser true fullscreen (where supported)
  const req =
    lightbox.requestFullscreen ||
    // @ts-ignore vendor
    lightbox.webkitRequestFullscreen ||
    // @ts-ignore vendor
    lightbox.msRequestFullscreen;
  if (typeof req === 'function') {
    try {
      const p = req.call(lightbox);
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          /* user gesture / policy — modal tetap full viewport */
        });
      }
    } catch {
      /* ignore */
    }
  }
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.classList.remove('lightbox-open');

  const doc = document;
  if (doc.fullscreenElement || doc.webkitFullscreenElement) {
    const exit =
      doc.exitFullscreen ||
      // @ts-ignore vendor
      doc.webkitExitFullscreen ||
      // @ts-ignore vendor
      doc.msExitFullscreen;
    if (typeof exit === 'function') {
      try {
        const p = exit.call(doc);
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * @param {boolean} ready
 * @param {string} [filenameLabel]
 */
function setPreviewReadyState(ready, filenameLabel) {
  previewFrameWrap.classList.toggle('is-empty', !ready);
  previewFrameWrap.disabled = !ready;
  previewZoomBadge.hidden = !ready;

  if (ready) {
    previewFrameWrap.title = 'Buka layar penuh';
    previewFrameWrap.setAttribute('aria-label', 'Buka preview invoice layar penuh');
    previewFilename.textContent = filenameLabel || 'Invoice siap';
    previewHint.textContent = PREVIEW_HINT_READY;
  } else {
    previewFrameWrap.title = 'Preview belum tersedia';
    previewFrameWrap.setAttribute('aria-label', 'Preview invoice — belum tersedia');
    previewFilename.textContent = 'Belum ada invoice';
    previewHint.textContent = PREVIEW_HINT_EMPTY;
  }
}

function setupLightbox() {
  previewFrameWrap.addEventListener('click', () => {
    if (previewFrameWrap.classList.contains('is-empty') || previewFrameWrap.disabled) {
      return;
    }
    if (!lastPreviewImageUrl && previewFrame.hidden === false) {
      // iframe fallback: buka PDF di tab baru
      if (previewFrame.src) {
        window.open(previewFrame.src.split('#')[0], '_blank', 'noopener');
      }
      return;
    }
    openLightbox();
  });

  lightboxClose.addEventListener('click', (e) => {
    e.stopPropagation();
    closeLightbox();
  });

  lightbox.addEventListener('click', (e) => {
    // Klik area gelap di luar gambar (atau di backdrop) menutup
    if (e.target === lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lightbox.hidden) {
      closeLightbox();
    }
  });

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && !lightbox.hidden) {
      // User keluar fullscreen via browser UI — tutup lightbox juga
      // Jangan auto-close: biarkan modal viewport tetap; hanya sync class
    }
  });
}

/**
 * @param {Blob} blob
 * @param {string} filename
 * @param {{ autoDownload?: boolean }} [opts]
 */
async function presentPdf(blob, filename, opts = {}) {
  const { autoDownload = true } = opts;
  lastBlob = blob;
  lastFilename = filename;

  btnRedownload.hidden = false;

  revokePreviousUrl();

  const ok = await renderFullPagePreview(blob);
  if (!ok) {
    // Fallback: iframe PDF dengan fit halaman
    lastObjectUrl = URL.createObjectURL(blob);
    previewFrame.src = `${lastObjectUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`;
    previewFrame.hidden = false;
    previewImage.hidden = true;
    previewImage.removeAttribute('src');
  }

  setPreviewReadyState(true, filename);

  // Scroll agar preview penuh siap di-screenshot
  requestAnimationFrame(() => {
    previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

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
setupLightbox();

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
    await presentPdf(blob, filename, { autoDownload: true });
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

function resetFormAll() {
  if (!lightbox.hidden) {
    closeLightbox();
  }

  form.reset();
  clearFormErrors(form, formError);

  form.querySelectorAll('.chip.is-active').forEach((el) => {
    el.classList.remove('is-active');
  });

  lastBlob = null;
  lastFilename = null;
  revokePreviousUrl();

  previewImage.hidden = true;
  previewImage.removeAttribute('src');
  previewFrame.hidden = true;
  previewFrame.removeAttribute('src');
  lightboxImage.removeAttribute('src');
  btnRedownload.hidden = true;
  setPreviewReadyState(false);

  setGenerating(false);

  const first = /** @type {HTMLInputElement | null} */ (
    document.getElementById('idPelanggan')
  );
  first?.focus();
}

btnReset.addEventListener('click', () => {
  resetFormAll();
});

window.addEventListener('beforeunload', () => {
  revokePreviousUrl();
});
