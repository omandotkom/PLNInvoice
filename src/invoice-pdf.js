import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { formatRp, formatToken, formatTanggalId } from './utils.js';

// pdfmake vfs fonts (supports older nested export and newer flat vfs map)
const vfs =
  pdfFonts?.pdfMake?.vfs ??
  pdfFonts?.vfs ??
  pdfFonts;
if (vfs) {
  if (typeof pdfMake.addVirtualFileSystem === 'function') {
    pdfMake.addVirtualFileSystem(vfs);
  } else {
    pdfMake.vfs = vfs;
  }
}

const COLORS = {
  brand: '#0B3D91',
  text: '#1A1A1A',
  muted: '#5C6570',
  line: '#D0D5DD',
  tableHeader: '#F2F4F7',
  tokenBg: '#F0F5FF',
  white: '#FFFFFF',
};

/**
 * @typedef {Object} InvoicePayload
 * @property {string} nama
 * @property {string} idPelanggan
 * @property {string} nomorToken
 * @property {number} nominal
 * @property {number} harga
 * @property {string} [part]
 * @property {Date} [tanggal]
 */

/**
 * Build pdfmake document definition for Fansa Digital PLN token invoice.
 * @param {InvoicePayload} data
 */
export function buildDocDefinition(data) {
  const now = data.tanggal ?? new Date();
  const tanggalLabel = formatTanggalId(now);
  const tokenLabel = formatToken(data.nomorToken);
  const hargaLabel = formatRp(data.harga);
  // Keterangan otomatis dari nominal: "Token PLN Rp 50.000"
  const keterangan = `Token PLN ${formatRp(data.nominal)}`;
  const partLabel = data.part ? String(data.part).trim() : '';

  /** @type {object[]} */
  const invoiceHeaderStack = [
    {
      text: 'INVOICE',
      fontSize: 20,
      bold: true,
      color: COLORS.brand,
      alignment: 'right',
    },
  ];
  if (partLabel) {
    invoiceHeaderStack.push({
      text: `Part ${partLabel}`,
      fontSize: 11,
      bold: true,
      color: COLORS.muted,
      alignment: 'right',
      margin: [0, 4, 0, 0],
    });
  }

  return {
    pageSize: 'A4',
    pageMargins: [48, 48, 48, 56],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
      color: COLORS.text,
      lineHeight: 1.35,
    },
    content: [
      {
        columns: [
          {
            width: '*',
            stack: [
              {
                text: 'FANSA DIGITAL',
                fontSize: 18,
                bold: true,
                color: COLORS.brand,
                characterSpacing: 0.5,
              },
              {
                text: 'Bukti Pembelian Token Listrik PLN',
                fontSize: 9,
                color: COLORS.muted,
                margin: [0, 4, 0, 0],
              },
            ],
          },
          {
            width: 'auto',
            stack: invoiceHeaderStack,
          },
        ],
        margin: [0, 0, 0, 16],
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 499,
            y2: 0,
            lineWidth: 1.5,
            lineColor: COLORS.brand,
          },
        ],
        margin: [0, 0, 0, 18],
      },
      {
        text: [
          { text: 'Tanggal  ', color: COLORS.muted, fontSize: 9 },
          { text: tanggalLabel, bold: true, fontSize: 10 },
        ],
        margin: [0, 0, 0, 18],
      },
      {
        text: 'DATA PELANGGAN',
        style: 'sectionTitle',
        margin: [0, 0, 0, 8],
      },
      {
        table: {
          widths: [120, '*'],
          body: [
            labelValueRow('ID Pelanggan', data.idPelanggan),
            labelValueRow('Nama', data.nama),
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 22],
      },
      {
        text: 'NOMOR TOKEN',
        style: 'sectionTitle',
        alignment: 'center',
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                stack: [
                  {
                    text: tokenLabel,
                    alignment: 'center',
                    bold: true,
                    fontSize: 18,
                    color: COLORS.brand,
                    characterSpacing: 1.2,
                    margin: [0, 10, 0, 10],
                  },
                ],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => COLORS.brand,
          vLineColor: () => COLORS.brand,
          fillColor: () => COLORS.tokenBg,
          paddingLeft: () => 12,
          paddingRight: () => 12,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
        margin: [0, 0, 0, 24],
      },
      {
        text: 'DETAIL TRANSAKSI',
        style: 'sectionTitle',
        margin: [0, 0, 0, 8],
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 120],
          body: [
            [
              {
                text: 'Keterangan',
                style: 'tableHeader',
              },
              {
                text: 'Jumlah',
                style: 'tableHeader',
                alignment: 'right',
              },
            ],
            [
              {
                text: keterangan,
                bold: true,
                fontSize: 10,
                margin: [0, 8, 0, 8],
              },
              {
                text: hargaLabel,
                alignment: 'right',
                margin: [0, 8, 0, 8],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: (i, node) =>
            i === 0 || i === 1 || i === node.table.body.length ? 0.8 : 0.4,
          vLineWidth: () => 0,
          hLineColor: () => COLORS.line,
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
          fillColor: (rowIndex) => (rowIndex === 0 ? COLORS.tableHeader : null),
        },
        margin: [0, 0, 0, 12],
      },
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 220,
            table: {
              widths: ['*', 'auto'],
              body: [
                [
                  {
                    text: 'Total',
                    bold: true,
                    fontSize: 11,
                  },
                  {
                    text: hargaLabel,
                    bold: true,
                    fontSize: 11,
                    alignment: 'right',
                    color: COLORS.brand,
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0,
              vLineWidth: () => 0,
              paddingLeft: () => 8,
              paddingRight: () => 8,
              paddingTop: () => 8,
              paddingBottom: () => 8,
              fillColor: () => COLORS.tableHeader,
            },
          },
        ],
        margin: [0, 0, 0, 28],
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 499,
            y2: 0,
            lineWidth: 0.6,
            lineColor: COLORS.line,
          },
        ],
        margin: [0, 0, 0, 14],
      },
      {
        text: 'Terima kasih telah bertransaksi.',
        alignment: 'center',
        color: COLORS.muted,
        fontSize: 9,
      },
      {
        text: 'Fansa Digital',
        alignment: 'center',
        bold: true,
        color: COLORS.brand,
        fontSize: 10,
        margin: [0, 4, 0, 0],
      },
    ],
    styles: {
      sectionTitle: {
        fontSize: 9,
        bold: true,
        color: COLORS.brand,
        characterSpacing: 0.8,
      },
      tableHeader: {
        bold: true,
        fontSize: 9,
        color: COLORS.muted,
      },
    },
    info: {
      title: `Invoice Token PLN — ${data.nama}`,
      author: 'Fansa Digital',
      subject: 'Bukti Pembelian Token Listrik PLN',
      creator: 'Fansa Digital Invoice Generator',
    },
  };
}

function labelValueRow(label, value) {
  return [
    {
      text: label,
      color: COLORS.muted,
      fontSize: 9,
      margin: [0, 2, 0, 2],
    },
    {
      text: value,
      bold: true,
      fontSize: 10,
      margin: [0, 2, 0, 2],
    },
  ];
}

/**
 * Generate PDF as Blob.
 * @param {InvoicePayload} data
 * @returns {Promise<Blob>}
 */
export function generateInvoicePdfBlob(data) {
  const docDefinition = buildDocDefinition(data);
  return new Promise((resolve, reject) => {
    try {
      const pdf = pdfMake.createPdf(docDefinition);
      pdf.getBlob((blob) => {
        if (!blob) {
          reject(new Error('Gagal membuat PDF.'));
          return;
        }
        resolve(blob);
      });
    } catch (err) {
      reject(err);
    }
  });
}
