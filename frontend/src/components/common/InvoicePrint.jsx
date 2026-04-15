import { useState, useCallback } from 'react';

// ─── Shop Info ────────────────────────────────────────────────────────────────
// Update these values to match your actual shop details
const SHOP = {
  name:    'SHREE GANESH KRUSHI SEVA KENDRA',
  address: 'At Post Jujarpur Tal Sangola Dist Solapur',
  line2:   'Pro: Vijaysinh Nagnath Bandgar Mob: 9172741002',
  line3:   'Sadashiv Manohar Chowgule Mob: 9975751002',
  gstin:   '27FVKPB5781H1Z8',
  lcid1:   'LCID 0720221358SOL',
  lcid2:   'LCFRD0320220224SOL',
  lcid3:   'LCSD0320220299SOL',
};

// ─── Pure helpers (no React) — used both in preview JSX and in print HTML ─────
const fmt = (n) =>
  Number(n ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (dateStr) => {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });
  return `${date} (${time})`;
};

// ─── Self-contained CSS for the print window ──────────────────────────────────
// This CSS must NOT rely on Tailwind because the popup window loads no
// stylesheets. Every style is explicit vanilla CSS. This is the single source
// of truth — the preview panel uses the same class names via a <style> tag
// injected into the preview iframe so preview and print are always identical.
const INVOICE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body, .inv-root {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    color: #000;
    background: #fff;
  }

  .inv-page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 8mm 10mm;
    background: #fff;
  }

  /* Header */
  .inv-header {
    display: grid;
    grid-template-columns: 1fr 160px;
    gap: 8px;
    align-items: start;
    margin-bottom: 4px;
  }
  .inv-shop-name {
    font-size: 17px;
    font-weight: 700;
    text-align: center;
    letter-spacing: 0.4px;
  }
  .inv-shop-sub {
    font-size: 10px;
    text-align: center;
    margin-top: 2px;
    color: #333;
  }
  .inv-gstin-box {
    text-align: right;
    font-size: 10px;
    font-weight: 700;
  }
  .inv-lcid {
    text-align: right;
    font-size: 9px;
    color: #555;
    margin-top: 1px;
  }
  .inv-divider {
    border-top: 2px solid #000;
    border-bottom: 2px solid #000;
    margin: 4px 0;
    height: 4px;
  }

  /* Customer row */
  .inv-customer-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 2px 12px;
    font-size: 11px;
    border-bottom: 1px solid #000;
    padding: 4px 0;
    margin-bottom: 4px;
  }
  .inv-customer-grid .lbl { font-weight: 700; }
  .inv-bill-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
  }
  .inv-bill-meta .right { text-align: right; font-weight: 700; }

  /* Items table */
  .inv-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10.5px;
    margin-bottom: 4px;
  }
  .inv-table th, .inv-table td {
    border: 1px solid #000;
    padding: 3px 4px;
    vertical-align: middle;
  }
  .inv-table thead th {
    background: #f0f0f0;
    font-weight: 700;
    text-align: center;
  }
  .inv-table .c  { text-align: center; }
  .inv-table .r  { text-align: right; }
  .inv-table .l  { text-align: left; }
  .inv-table tbody tr:nth-child(even) { background: #fafafa; }
  .inv-empty-row { height: 22px; }

  /* Footer grid */
  .inv-footer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 4px;
  }

  /* Tax summary */
  .inv-tax-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
    margin-bottom: 4px;
  }
  .inv-tax-table td {
    border: 1px solid #000;
    padding: 2px 4px;
  }
  .inv-tax-table .lbl { font-weight: 700; }
  .inv-tax-table .mono { font-family: 'Courier New', monospace; }

  /* Words box */
  .inv-words {
    border: 1px solid #aaa;
    padding: 3px 6px;
    font-size: 9.5px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  /* Balance row */
  .inv-balance {
    display: flex;
    gap: 14px;
    font-size: 10px;
    font-weight: 600;
  }

  /* Net total */
  .inv-net-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 2px solid #000;
    padding: 6px 10px;
    margin-bottom: 8px;
  }
  .inv-net-total .label { font-size: 13px; font-weight: 700; }
  .inv-net-total .amount { font-size: 22px; font-weight: 700; }

  /* Signature */
  .inv-signature {
    text-align: right;
    font-size: 9px;
    color: #555;
    margin-top: 6px;
  }

  /* Page footer */
  .inv-page-footer {
    border-top: 1px solid #000;
    margin-top: 6px;
    padding-top: 3px;
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #555;
  }

  /* Print overrides */
  @media print {
    @page { size: A4 portrait; margin: 8mm; }
    body { background: #fff !important; }
    .inv-page { width: 100% !important; padding: 0 !important; }
    * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  }
`;

// ─── Build the complete invoice HTML string ───────────────────────────────────
// Used both for the popup print window AND for the iframe preview — guarantees
// preview and print are always pixel-identical.
const buildInvoiceHTML = (invoice) => {
  const taxableAmount = invoice.subTotal ?? 0;
  const emptyRowCount = Math.max(0, 5 - (invoice.items?.length ?? 0));

  const itemRows = (invoice.items ?? []).map((item, i) => {
    const rateWithGst =
      item.quantity > 0 ? item.total / item.quantity : item.price;
    const rowBg = i % 2 === 1 ? 'background:#fafafa;' : '';
    return `
      <tr style="${rowBg}">
        <td class="c">${i + 1}</td>
        <td class="l" style="font-weight:600">${item.productName}</td>
        <td class="c">${item.hsn || '—'}</td>
        <td class="c">${item.batch || '—'}</td>
        <td class="c">${item.expiry || '—'}</td>
        <td class="r">${item.quantity}.0</td>
        <td class="r">${fmt(item.price)}</td>
        <td class="c">${item.gstRate}.00</td>
        <td class="r">${fmt(rateWithGst)}</td>
        <td class="r" style="font-weight:600">${fmt(item.total)}</td>
      </tr>`;
  }).join('');

  const emptyRows = Array.from({ length: emptyRowCount })
    .map(() => `<tr class="inv-empty-row">${'<td></td>'.repeat(10)}</tr>`)
    .join('');

  return `
    <div class="inv-page">

      <!-- Header -->
      <div class="inv-header">
        <div>
          <div class="inv-shop-name">${SHOP.name}</div>
          <div class="inv-shop-sub">${SHOP.address}</div>
          <div class="inv-shop-sub">${SHOP.line2}</div>
          <div class="inv-shop-sub">${SHOP.line3}</div>
        </div>
        <div>
          <div class="inv-gstin-box">GSTIN : ${SHOP.gstin}</div>
          <div class="inv-lcid">${SHOP.lcid1}</div>
          <div class="inv-lcid">${SHOP.lcid2}</div>
          <div class="inv-lcid">${SHOP.lcid3}</div>
        </div>
      </div>
      <div class="inv-divider"></div>

      <!-- Customer -->
      <div class="inv-customer-grid">
        <div><span class="lbl">Name : </span>${invoice.customerName}</div>
        <div><span class="lbl">Mob : </span>${invoice.mobile}</div>
        <div class="inv-bill-meta">
          <div><span class="lbl">Bill No : </span>${invoice.invoiceNumber?.split('-').pop()}</div>
          <div class="right">[${(invoice.paymentMode ?? '').toUpperCase()}] Cash Bill</div>
        </div>
        <div><span class="lbl">Address : </span></div>
        <div><span class="lbl">GSTN : </span></div>
        <div><span class="lbl">Date : </span>${fmtDate(invoice.createdAt)}</div>
      </div>

      <!-- Items table -->
      <table class="inv-table">
        <thead>
          <tr>
            <th class="l" style="width:22px">Sr.</th>
            <th class="l">Product Details</th>
            <th style="width:52px">HSN</th>
            <th style="width:60px">BATCH</th>
            <th style="width:62px">EXPIRY</th>
            <th style="width:30px">Qty</th>
            <th style="width:62px">Rate</th>
            <th style="width:40px">GST%</th>
            <th style="width:70px">Rate (With GST)</th>
            <th style="width:68px">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
          ${emptyRows}
        </tbody>
      </table>

      <!-- Footer -->
      <div class="inv-footer">

        <!-- Left -->
        <div>
          <table class="inv-tax-table">
            <tr>
              <td class="lbl" style="width:25%">Taxable</td>
              <td class="mono" style="width:25%">${fmt(taxableAmount)}</td>
              <td class="lbl" style="width:25%">CGST</td>
              <td class="mono" style="width:25%">${fmt(invoice.cgstTotal)}</td>
            </tr>
            <tr>
              <td></td><td></td>
              <td class="lbl">SGST</td>
              <td class="mono">${fmt(invoice.sgstTotal)}</td>
            </tr>
          </table>
          <div class="inv-words">
            Bill In Words: <em>${invoice.amountInWords || ''}</em>
          </div>
          <div class="inv-balance">
            <span>Op Bal: ${fmt(invoice.openingBalance)}</span>
            <span>Dr-Inv: ${fmt(invoice.drInvoice)}</span>
            <span>ClBalance. : <strong>${fmt(invoice.closingBalance)}</strong></span>
          </div>
        </div>

        <!-- Right -->
        <div style="display:flex;flex-direction:column;justify-content:space-between;">
          <div class="inv-net-total">
            <span class="label">Net Total :</span>
            <span class="amount">${Number(invoice.grandTotal ?? 0).toLocaleString('en-IN')}</span>
          </div>
          <div class="inv-signature">
            <div>For ${SHOP.name.split(' ').slice(0, 3).join(' ')}</div>
            <div>Krushi Seva Kendra</div>
          </div>
        </div>
      </div>

      <!-- Page footer -->
      <div class="inv-page-footer">
        <span>This Is Computer Generated Tax Invoice | Subject To Sangola Jurisdiction</span>
        <span>Page 1 of 1</span>
      </div>
    </div>`;
};

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * InvoicePrint
 *
 * Shows a modal overlay with a live preview of the invoice (rendered via an
 * iframe that uses the same self-contained CSS as the print window). When the
 * user clicks "Print Invoice", the same HTML+CSS is opened in a new window and
 * window.print() is called — guaranteeing preview === print output.
 *
 * Props:
 *   invoice  {object}    — invoice document from API (with amountInWords)
 *   onClose  {function}  — called when user closes the overlay
 */
const InvoicePrint = ({ invoice, onClose }) => {
  const [popupBlocked, setPopupBlocked] = useState(false);

  const handlePrint = useCallback(() => {
    const html = buildInvoiceHTML(invoice);
    const fullDoc = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Invoice ${invoice.invoiceNumber}</title>
    <style>${INVOICE_CSS}</style>
  </head>
  <body class="inv-root">
    ${html}
  </body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=720');
    if (!printWindow) {
      setPopupBlocked(true);
      return;
    }
    setPopupBlocked(false);
    printWindow.document.write(fullDoc);
    printWindow.document.close();
    printWindow.focus();
    // Give the browser 400ms to fully render fonts/layout before printing
    setTimeout(() => {
      printWindow.print();
      // Close after printing (user can cancel print dialog, window closes regardless)
      printWindow.onafterprint = () => printWindow.close();
      // Fallback close if onafterprint isn't supported
      setTimeout(() => { try { printWindow.close(); } catch (_) {} }, 3000);
    }, 400);
  }, [invoice]);

  if (!invoice) return null;

  // Build the preview HTML (same function, same output → preview === print)
  const previewHTML = buildInvoiceHTML(invoice);

  // Full document for the preview iframe
  const previewDoc = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>${INVOICE_CSS}
      /* Scale down slightly so the A4 page fits inside the preview container */
      body { background: #e5e7eb; padding: 12px; }
      .inv-page {
        transform-origin: top center;
        transform: scale(0.78);
        margin-bottom: -200px; /* compensate for scale shrinkage */
        box-shadow: 0 4px 24px rgba(0,0,0,0.15);
      }
    </style>
  </head>
  <body class="inv-root">
    ${previewHTML}
  </body>
</html>`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-700/60 overflow-hidden">

      {/* ── Control bar ── */}
      <div className="shrink-0 bg-gray-900 text-white px-6 py-3 flex items-center justify-between shadow-lg">
        <div>
          <h3 className="font-semibold text-base">Invoice Preview</h3>
          <p className="text-xs text-gray-400">{invoice.invoiceNumber} · {invoice.customerName}</p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
          >
            ✕ Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-500 text-white font-semibold flex items-center gap-2 transition-colors"
          >
            🖨️ Print Invoice
          </button>
        </div>
      </div>

      {/* ── Popup-blocked warning ── */}
      {popupBlocked && (
        <div className="shrink-0 bg-yellow-50 border-b border-yellow-300 px-6 py-2.5 flex items-center gap-3 text-sm text-yellow-800">
          <span className="text-lg">⚠️</span>
          <span>
            <strong>Popup blocked.</strong> Allow popups for this site in your browser address bar,
            then click <strong>Print Invoice</strong> again.
          </span>
        </div>
      )}

      {/* ── Preview iframe — identical output to the print window ── */}
      <div className="flex-1 overflow-auto bg-gray-300 flex justify-center py-4 px-4">
        <iframe
          title="Invoice Preview"
          srcDoc={previewDoc}
          className="w-full rounded-sm shadow-2xl"
          style={{ maxWidth: '860px', height: '950px', border: 'none' }}
        />
      </div>
    </div>
  );
};

export default InvoicePrint;
