# Design: Simple Invoice Generator — Fansa Digital (Token Listrik PLN)

**Date:** 2026-07-12  
**Status:** Approved (pending user review of this written spec)  
**Deploy target:** Cloudflare Pages  
**Approach:** Client-side static app + pdfmake (Approach A)

## 1. Goal

Build a simple web app that generates a professional PDF invoice for PLN electricity token purchases, branded as **Fansa Digital**. The app runs entirely in the browser and deploys as a static site on Cloudflare Pages.

## 2. Scope

### In scope

- Single-page form: customer name, customer ID (IDPEL), token number, nominal amount
- Client-side validation (Bahasa Indonesia messages)
- PDF invoice generation with Fansa Digital text branding
- Preview PDF on the page and automatic download after generate
- Manual re-download button after generate
- Static deploy to Cloudflare Pages

### Out of scope (YAGNI)

- Authentication / multi-user
- Backend, database, invoice history storage
- Admin fee, tax, multi-line items
- Logo image file
- Server-side PDF generation / Cloudflare Workers API
- PLN API integration or live token purchase

## 3. User flow

1. User opens the app.
2. User fills: Nama Pelanggan, ID Pelanggan, Nomor Token, Nominal (Rp).
3. User clicks **Buat Invoice**.
4. Client validates inputs; on failure, show Indonesian error messages and do not generate.
5. On success:
   - Build invoice document definition.
   - Generate PDF blob via pdfmake.
   - Show preview (iframe/embed).
   - Trigger automatic file download.
6. User may click **Unduh ulang** to download again without re-entering data (uses last generated blob).

## 4. Architecture

```
Browser (static assets on Cloudflare Pages)
  ├── index.html + CSS + JS modules
  ├── Form UI + validation
  └── pdfmake → PDF blob → preview iframe + download
```

- **No server runtime required** for invoice generation.
- All logic is client-side; suitable for Cloudflare Pages static hosting.
- **Vite is required** for ES module bundling, pdfmake dependency resolution, and production `dist/` output.

## 5. Tech stack

| Layer | Choice | Reason |
|-------|--------|--------|
| UI | HTML + CSS + vanilla JS (Vite) | Minimal, fast, CF Pages friendly |
| PDF | pdfmake (+ default/vfs fonts) | Declarative layout, sharp text, no canvas quirks |
| Deploy | Cloudflare Pages | Requested target; static output |
| Language | Bahasa Indonesia | UI labels, validation, PDF copy |

## 6. Project structure

```
/
├── index.html
├── package.json
├── vite.config.js
├── public/                 # static assets if needed
├── src/
│   ├── main.js             # app bootstrap, wire form → generate → preview/download
│   ├── form.js             # read fields, validate, format nominal
│   ├── invoice-pdf.js      # pdfmake doc definition + generate PDF blob
│   ├── utils.js            # formatRp, formatToken, invoice number, date
│   └── styles.css          # page layout, form, preview area
├── docs/superpowers/specs/ # design specs
└── README.md
```

### Module responsibilities

| Module | Responsibility | Depends on |
|--------|----------------|------------|
| `form.js` | Collect inputs; validate; return clean data or errors | `utils.js` (optional format helpers) |
| `invoice-pdf.js` | Map form data → pdfmake definition; return PDF blob | pdfmake, `utils.js` |
| `utils.js` | Rupiah format, token grouping, invoice no., date labels | none |
| `main.js` | Event handlers, loading state, preview iframe, download | form, invoice-pdf, utils |
| `styles.css` | Responsive form + preview chrome (not PDF styles) | none |

## 7. Form UI & validation

### Fields

| Field | Label (UI) | Type | Rules |
|-------|------------|------|--------|
| `nama` | Nama Pelanggan | text | Required; trim; min length 2 |
| `idPelanggan` | ID Pelanggan (IDPEL) | text | Required; digits only; length 11–13 (typical PLN IDPEL) |
| `nomorToken` | Nomor Token | text | Required; min 1 digit after stripping spaces; keep raw digits for PDF; display grouped every 4 digits when pure digits |
| `nominal` | Nominal (Rp) | number/text | Required; positive integer (whole rupiah only, no decimals); UI may show thousand separators |

### Actions

- Primary: **Buat Invoice** (Bahasa Indonesia)
- While generating: disable button + label **Membuat…**
- Secondary (after success): **Unduh ulang**

### Errors

- Show field-level or form-level messages in Bahasa Indonesia.
- Do not call PDF generation if validation fails.

## 8. PDF invoice content

### Layout (A4 portrait)

1. **Header:** FANSA DIGITAL (bold text brand) + title “INVOICE” / subtitle “Bukti Pembelian Token Listrik PLN”
2. **Meta:** Nomor Invoice, Tanggal
3. **Data pelanggan:** Nama, ID Pelanggan
4. **Detail transaksi:** table — keterangan (Token Listrik PLN + nomor token) and jumlah (Rp)
5. **Total:** same as nominal (no admin fee)
6. **Footer:** short thank-you + “Fansa Digital”

### Content rules

| Item | Rule |
|------|------|
| Branding | Text only: “FANSA DIGITAL” — no logo image |
| Invoice number | `INV-YYYYMMDD-XXXX` where `XXXX` is 4 digits derived from time/random for uniqueness in-session |
| Date | Local browser date, Indonesian-friendly label (e.g. `12 Juli 2026`) |
| Nominal | `Rp 50.000` style (dot thousands, no decimals required for whole rupiah) |
| Token display | As entered, preferably grouped every 4 digits for readability when digit-only |
| Colors | Neutral professional: black/gray body, dark blue accent for headers/brand |
| Language | All PDF labels in Bahasa Indonesia |

### Download filename

```
invoice-fansa-digital-<idpel>-YYYYMMDD.pdf
```

Example: `invoice-fansa-digital-12345678901-20260712.pdf`

## 9. Data flow

```
User input
  → validate (form.js)
  → { nama, idPelanggan, nomorToken, nominal, invoiceNo, tanggal }
  → buildDocDefinition (invoice-pdf.js)
  → pdfmake.createPdf(...).getBlob()
  → store lastBlob in memory
  → set iframe src = object URL(lastBlob)
  → trigger <a download> or equivalent with filename
```

No persistence beyond the current page session (in-memory last blob only).

## 10. Error handling

| Case | Behavior |
|------|----------|
| Empty/invalid fields | Indonesian validation messages; no PDF |
| pdfmake/runtime failure | Show generic error: gagal membuat PDF; re-enable generate |
| Browser blocks auto-download | Preview still shown; user can use **Unduh ulang** |
| Invalid object URL / revoke | Revoke previous object URL when generating a new PDF to avoid leaks |

## 11. Testing strategy

Manual / lightweight checks sufficient for v1:

1. Valid form → PDF preview appears and file downloads.
2. Each validation rule blocks generate with correct message.
3. Nominal and token formatting appear correctly on PDF.
4. Invoice number and date look correct.
5. Re-download works without regenerating from empty form.
6. Mobile viewport: form usable; preview scrollable.
7. Production build (`vite build`) serves correctly as static files.

Optional later: unit tests for `formatRp`, invoice number, and validation helpers.

## 12. Deployment (Cloudflare Pages)

1. `npm install` / `npm run build` → output `dist/`
2. Cloudflare Pages project: build command `npm run build`, output directory `dist`
3. Or direct upload of `dist` via Wrangler / dashboard
4. No environment secrets required for v1
5. HTTPS provided by Cloudflare; app is public (no auth)

## 13. Success criteria

- User can generate a clean, print-ready PLN token invoice PDF branded Fansa Digital in under a minute.
- No backend required; works on Cloudflare Pages static hosting.
- Form + PDF fully in Bahasa Indonesia.
- Preview and auto-download both work after generate.

## 14. Future extensions (not in v1)

- Logo image toggle
- Admin fee / multi-item lines
- Saved history (localStorage or backend)
- Custom invoice template themes
- Print-optimized CSS mirror of PDF

## 15. Decisions log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Product | Token listrik PLN | Confirmed by stakeholder |
| Nominal | User-entered on same form | Confirmed |
| Admin fee | None | Confirmed |
| Branding | Text “Fansa Digital” only | Minimal branding request |
| Language | Bahasa Indonesia | Confirmed |
| After generate | Preview + auto download | Confirmed |
| PDF library | pdfmake | Structured invoice layout, static-friendly |
| Stack | Vite + vanilla JS | Simple, CF Pages native |
| Auth / storage | None | YAGNI for simple generator |
