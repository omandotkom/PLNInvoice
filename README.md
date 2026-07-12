# PLN Invoice Generator — Fansa Digital

Generator invoice PDF untuk **bukti pembelian token listrik PLN**, dengan branding **Fansa Digital**.

Aplikasi **100% client-side** (tanpa backend): isi form → generate PDF → preview di browser + unduh otomatis. Siap di-deploy ke **Cloudflare Pages**.

> **Managed by [Appverse](https://appverse.id)** · [appverse.id](https://appverse.id)

---

## Daftar isi

- [Tentang](#tentang)
- [Fitur](#fitur)
- [Stack teknologi](#stack-teknologi)
- [Prasyarat](#prasyarat)
- [Instalasi & pengembangan lokal](#instalasi--pengembangan-lokal)
- [Build production](#build-production)
- [Deploy ke Cloudflare Pages](#deploy-ke-cloudflare-pages)
- [Cara pakai](#cara-pakai)
- [Struktur project](#struktur-project)
- [Form & validasi](#form--validasi)
- [Isi PDF invoice](#isi-pdf-invoice)
- [Dokumentasi desain](#dokumentasi-desain)
- [Lisensi & branding](#lisensi--branding)

---

## Tentang

| Item | Detail |
|------|--------|
| Nama product | Invoice Generator Token Listrik PLN |
| Brand invoice | **Fansa Digital** |
| Platform deploy | Cloudflare Pages (static) |
| Bahasa UI & PDF | Bahasa Indonesia |
| Backend | Tidak ada (semua di browser) |
| Managed by | **[Appverse](https://appverse.id)** |

Repo: [github.com/omandotkom/PLNInvoice](https://github.com/omandotkom/PLNInvoice)

---

## Fitur

- **Form invoice lengkap**
  - ID Pelanggan (IDPEL)
  - Nama Pelanggan
  - Nomor Token
  - Nominal Token (nilai token)
  - Harga (bisa berbeda dari nominal)
  - Part (opsional, mis. `1/2`)
- **Ikon paste** di setiap field — tempel cepat dari clipboard
- **Instant chip** untuk Nominal & Harga: `20rb` · `50rb` · `100rb` · `200rb` · `500rb` · `1jt`
- **Validasi client-side** dengan pesan Bahasa Indonesia
- **Generate PDF** rapi branding Fansa Digital
- **Preview PDF** di halaman + **unduh otomatis**
- Tombol **Unduh ulang** tanpa mengisi ulang form
- **Tanpa login**, tanpa database, tanpa nomor invoice otomatis

---

## Stack teknologi

| Layer | Teknologi |
|-------|-----------|
| Build tool | [Vite](https://vitejs.dev/) 6 |
| Bahasa | HTML, CSS, JavaScript (ES modules) |
| PDF | [pdfmake](http://pdfmake.org/) |
| Hosting target | Cloudflare Pages |

Tidak ada framework UI berat — ringan dan mudah di-maintain.

---

## Prasyarat

- **Node.js** 18+ (disarankan 20 atau 22)
- **npm** 9+
- Browser modern (Chrome, Edge, Firefox, Safari)

---

## Instalasi & pengembangan lokal

```bash
# Clone
git clone https://github.com/omandotkom/PLNInvoice.git
cd PLNInvoice

# Install dependency
npm install

# Jalankan dev server
npm run dev
```

Buka URL yang ditampilkan Vite (biasanya `http://localhost:5173`).

Hot reload aktif saat mengubah file di `src/` atau `index.html`.

---

## Build production

```bash
npm run build
```

Output statis ada di folder **`dist/`**.

Cek build lokal:

```bash
npm run preview
```

---

## Deploy ke Cloudflare

Project ini **static site** (hasil `dist/`). Ada dua jalur deploy di Cloudflare.

### Opsi A — Cloudflare Pages (paling sederhana, disarankan)

1. Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Pilih repo `omandotkom/PLNInvoice`
3. Pengaturan build:

| Setting | Nilai |
|---------|--------|
| Framework preset | **None** (atau Vite) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` (default) |
| **Deploy command** | **Kosongkan** (jangan isi `wrangler deploy`) |
| Node.js | 18 / 20 / 22 |

4. **Save and Deploy**

Pages akan otomatis mengunggah isi `dist/` setelah build. **Tidak perlu** `npx wrangler deploy`.

### Opsi B — Workers + Static Assets (jika build system memakai Wrangler)

Repo sudah punya `wrangler.toml` yang mengarah ke `./dist`, supaya deploy **non-interaktif** di CI.

| Setting | Nilai |
|---------|--------|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Output / assets | `dist` (via `wrangler.toml`) |

File `wrangler.toml`:

```toml
name = "plninvoice"
compatibility_date = "2025-07-12"

[assets]
directory = "./dist"
```

### Opsi C — Upload manual / CLI

```bash
npm run build
npx wrangler pages deploy dist --project-name=plninvoice
```

### Troubleshooting: build sukses tapi deploy hang / gagal

Log seperti ini:

```text
Success: Build command completed
Executing user deploy command: npx wrangler deploy
? Do you want to modify these settings?
Using fallback value in non-interactive context: no
```

**Penyebab:** `wrangler deploy` dijalankan **tanpa** `wrangler.toml` (mode interaktif) di lingkungan CI.

**Solusi:**

1. Pastikan file **`wrangler.toml`** ada di root repo (sudah disediakan), lalu redeploy; **atau**
2. Jika pakai **Pages klasik**: kosongkan **Deploy command**, biarkan hanya:
   - Build: `npm run build`
   - Output directory: `dist`

Peringatan Vite *chunk > 500 kB* (pdfmake) **bukan error** — build tetap sukses.

### Catatan deploy

- Tidak perlu environment secret untuk v1
- Aplikasi bersifat **publik** (siapa pun yang punya URL bisa generate invoice)
- HTTPS disediakan Cloudflare
---

## Cara pakai

1. Buka aplikasi di browser.
2. Isi **ID Pelanggan** dan **Nama Pelanggan**.
3. Isi **Nomor Token** (bisa tempel lewat ikon paste).
4. Pilih **Nominal** lewat chip atau ketik manual.
5. Isi **Harga** (boleh beda dari nominal — mis. ada margin).
6. (Opsional) isi **Part**, contoh `1/2` = invoice 1 dari 2.
7. Klik **Buat Invoice**.
8. PDF muncul di preview dan otomatis terunduh.
9. Pakai **Unduh ulang** jika perlu file lagi.

Nama file unduhan contoh:

```text
invoice-fansa-digital-<idpel>-YYYYMMDD.pdf
```

---

## Struktur project

```text
PLNInvoice/
├── index.html              # UI form + preview
├── package.json
├── vite.config.js
├── public/                 # (opsional) static assets
├── src/
│   ├── main.js             # Event form, paste, chip, preview, unduh
│   ├── form.js             # Baca & validasi form
│   ├── invoice-pdf.js      # Layout PDF (pdfmake)
│   ├── utils.js            # Format Rp, token, tanggal, nama file
│   └── styles.css          # Styling UI
├── docs/superpowers/specs/ # Design specs
├── dist/                   # Output build (di-gitignore)
└── README.md
```

---

## Form & validasi

| Field | Wajib | Aturan |
|-------|-------|--------|
| ID Pelanggan (IDPEL) | Ya | Angka, 11–13 digit |
| Nama Pelanggan | Ya | Minimal 2 karakter |
| Nomor Token | Ya | Harus berisi angka |
| Nominal Token | Ya | Bilangan bulat > 0 |
| Harga | Ya | Bilangan bulat > 0 |
| Part | Tidak | Teks bebas (mis. `1/2`); kosong = tidak tampil di PDF |

**Nominal vs Harga**

- **Nominal** → keterangan di PDF menjadi otomatis: `Token PLN Rp 50.000`
- **Harga** → nilai yang tampil di kolom Jumlah & Total (harga jual)

---

## Isi PDF invoice

Layout ringkas (A4):

1. Header: **FANSA DIGITAL** + judul **INVOICE**
2. Jika Part diisi → `Part 1/2` di bawah INVOICE
3. Tanggal generate
4. Data pelanggan: ID Pelanggan, Nama
5. **Nomor token** — besar, bold, di tengah
6. Detail transaksi: keterangan `Token PLN Rp [nominal]` + jumlah = harga
7. Total = harga
8. Footer ucapan terima kasih + Fansa Digital

---

## Dokumentasi desain

| Spec | File |
|------|------|
| Desain utama generator | [`docs/superpowers/specs/2026-07-12-invoice-generator-design.md`](docs/superpowers/specs/2026-07-12-invoice-generator-design.md) |
| Label Part (1/2) | [`docs/superpowers/specs/2026-07-12-invoice-part-label-design.md`](docs/superpowers/specs/2026-07-12-invoice-part-label-design.md) |

---

## Script npm

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Dev server + HMR |
| `npm run build` | Build production → `dist/` |
| `npm run preview` | Preview hasil build |

---

## Lisensi & branding

- **Brand invoice:** Fansa Digital  
- **Managed by:** [Appverse](https://appverse.id) — [appverse.id](https://appverse.id)  
- Repo: [github.com/omandotkom/PLNInvoice](https://github.com/omandotkom/PLNInvoice)

```text
  PLN Invoice Generator — Fansa Digital
  ────────────────────────────────────
  Managed by Appverse · appverse.id
```

Untuk kerja sama produk digital, kunjungi **[appverse.id](https://appverse.id)**.

---

<p align="center">
  <strong>Fansa Digital</strong><br/>
  <sub>Managed by <a href="https://appverse.id">Appverse</a> · appverse.id</sub>
</p>
