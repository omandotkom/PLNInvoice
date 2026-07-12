# Design: Label Part Invoice (mis. 1/2)

**Date:** 2026-07-12  
**Status:** Approved (pending user review of this written spec)  
**Parent:** `2026-07-12-invoice-generator-design.md`  
**Scope:** Additive feature on existing Fansa Digital invoice generator

## 1. Goal

Allow the user to optionally mark an invoice as part of a multi-part set (e.g. **1/2** meaning invoice 1 of 2). The value is **user-entered free text only** — no automatic multi-PDF generation or splitting.

## 2. Scope

### In scope

- Optional form field: **Part** (free text, e.g. `1/2`, `2/3`)
- Paste icon on the field (same pattern as other fields)
- If filled: show on PDF near the **INVOICE** title as `Part {user text}`
- If empty: omit part line entirely from PDF

### Out of scope

- Generating multiple PDF files in one click
- Auto-increment / auto-split of invoices
- Strict `digit/digit` validation
- Database or history of parts

## 3. Decisions

| Topic | Choice |
|-------|--------|
| Input shape | **A** — single free-text field |
| Required | **Optional** — empty → not shown on PDF |
| PDF position | Near **INVOICE** title (header right, below “INVOICE”) |
| Approach | **A — Ringkas** — trim only, no format validation |

## 4. User flow

1. User fills existing invoice fields as today.
2. Optionally fills **Part** (e.g. `1/2`), or pastes via paste icon.
3. User clicks **Buat Invoice**.
4. PDF includes `Part 1/2` under INVOICE only when Part is non-empty after trim.
5. Empty Part → PDF identical to current layout (no part line).

## 5. Form UI

| Property | Value |
|----------|--------|
| Label | Part |
| `id` / `name` | `part` |
| Type | text |
| Required | no |
| Placeholder | `1/2` |
| Hint (optional short) | Mis. `1/2` = invoice 1 dari 2 |
| Paste button | yes (`data-paste-target="part"`) |
| Position in form | After **Harga**, before form error / actions |

### Validation

- Not required.
- If present: `trim()` only; store trimmed string.
- No pattern check (`1/2` vs free text both allowed).
- Empty after trim → treat as absent (`null` / omit field).

## 6. PDF layout

Header right stack (existing “INVOICE” title):

```
INVOICE
Part 1/2          ← only if part is non-empty
```

- Prefix label fixed: **`Part `** (with space) + user text as-is after trim.
- Example: user types `1/2` → display **`Part 1/2`**.
- Styling: smaller than INVOICE title, muted or brand-secondary, right-aligned to match INVOICE.
- If empty: no second line (no empty “Part ” row).

## 7. Module changes

| File | Change |
|------|--------|
| `index.html` | Add Part field + paste button after Harga |
| `src/form.js` | Read `part`; include in data when non-empty after trim |
| `src/invoice-pdf.js` | Accept optional `part`; render under INVOICE when set |
| `src/main.js` | No special money format; paste works via existing setup |
| `src/styles.css` | Reuse existing field / paste styles (no new layout system) |

### Data shape

```ts
// InvoiceFormData / InvoicePayload addition
part?: string  // omitted or undefined when empty
```

## 8. Error handling

| Case | Behavior |
|------|----------|
| Part empty | OK; PDF without part line |
| Clipboard paste fails | Same as other paste buttons |
| Very long text | Allowed (no max in v1); layout may wrap — acceptable for free text |

## 9. Testing (manual)

1. Generate with Part empty → no “Part …” on PDF.
2. Generate with Part `1/2` → `Part 1/2` under INVOICE, right-aligned.
3. Paste into Part works.
4. Existing fields/PDF behavior unchanged when Part unused.

## 10. Success criteria

- User can mark multi-part invoices with free text in under a few seconds.
- Empty Part does not clutter the PDF.
- No regression to current generate/preview/download flow.
