# Invoice Generator — Fansa Digital

Generator invoice PDF untuk **token listrik PLN**, branding **Fansa Digital**.  
Aplikasi static (Vite + pdfmake), cocok di-deploy ke **Cloudflare Pages**.

## Fitur

- Form: nama, ID pelanggan (IDPEL), nomor token, **nominal token**, **harga**
- Keterangan PDF otomatis: `Token PLN Rp [nominal]` (harga bisa beda dari nominal)
- Nomor token ditampilkan besar, bold, di tengah PDF
- Validasi client-side (Bahasa Indonesia)
- Generate PDF + preview + unduh otomatis / unduh ulang
- Tanpa backend / login / nomor invoice

## Pengembangan lokal

```bash
npm install
npm run dev
```

Buka URL yang ditampilkan Vite (biasanya `http://localhost:5173`).

## Build production

```bash
npm run build
```

Output di folder `dist/`.

```bash
npm run preview
```

## Deploy Cloudflare Pages

| Setting | Nilai |
|---------|--------|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 18+ (disarankan 20/22) |

Atau unggah isi `dist/` lewat dashboard / Wrangler.

## Spec desain

Lihat `docs/superpowers/specs/2026-07-12-invoice-generator-design.md`.
