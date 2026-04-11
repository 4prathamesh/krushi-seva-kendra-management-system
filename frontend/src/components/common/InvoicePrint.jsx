import { useRef } from 'react';

// ─── Shop constants — update these to match your actual shop ─────────────────
const SHOP = {
  name:    'SHREE GANESH KRUSHI SEVA KENDRA',
  address: 'At Post Jujarpur Tal Sangola Dist Solapur',
  pro:     'Pro: Vijaysinh Nagnath Bandgar Mob: 9172741002',
  mob2:    'Sadashiv Manohar Chowgule Mob: 9975751002',
  gstin:   '27FVKPB5781H1Z8',
  lcid1:   'LCID 0720221358SOL',
  lcid2:   'LCFRD0320220224SOL',
  lcid3:   'LCSD0320220299SOL',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  }) + ' (' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ')';
};

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * FILE: src/components/common/InvoicePrint.jsx
 *
 * Renders a GST tax invoice in A4 format, matching the sample bill layout.
 * Call printInvoice() from the parent, or pass printRef to an external handler.
 *
 * Props:
 *   invoice  {object}   — invoice document from API
 *   onClose  {function} — called when the modal/page is closed
 */
const InvoicePrint = ({ invoice, onClose }) => {
  const printRef = useRef(null);

  const handlePrint = () => {
    // Open a new window with just the invoice HTML — avoids React portal issues
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    const content     = printRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            /* ── Reset ── */
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              font-size: 11px;
              color: #000;
              background: #fff;
            }

            /* ── Page ── */
            .invoice-page {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 8mm 10mm;
              border: 1px solid #aaa;
            }

            /* ── Header ── */
            .header-grid {
              display: grid;
              grid-template-columns: 1fr auto;
              align-items: start;
              margin-bottom: 4px;
            }
            .shop-name {
              font-size: 18px;
              font-weight: 700;
              text-align: center;
              letter-spacing: 0.5px;
            }
            .shop-sub {
              font-size: 10px;
              text-align: center;
              margin-top: 2px;
            }
            .gstin-box {
              text-align: right;
              font-size: 10px;
              font-weight: 600;
            }
            .lcid-box {
              text-align: right;
              font-size: 9px;
              color: #555;
              margin-top: 2px;
            }
            .header-divider {
              border-top: 2px solid #000;
              border-bottom: 2px solid #000;
              padding: 3px 0;
              margin: 4px 0;
            }

            /* ── Customer row ── */
            .customer-row {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 4px;
              font-size: 11px;
              border-bottom: 1px solid #000;
              padding: 4px 0;
            }
            .label { font-weight: 600; }

            /* ── Table ── */
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 4px;
              font-size: 10.5px;
            }
            th, td {
              border: 1px solid #000;
              padding: 3px 4px;
              vertical-align: middle;
            }
            thead th {
              background: #f0f0f0;
              font-weight: 700;
              text-align: center;
            }
            td.num { text-align: right; }
            td.center { text-align: center; }
            tbody tr:nth-child(even) { background: #fafafa; }

            /* ── Footer totals ── */
            .footer-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 6px;
              margin-top: 6px;
              font-size: 11px;
            }
            .tax-row {
              display: flex;
              justify-content: space-between;
              border: 1px solid #ccc;
              padding: 2px 6px;
              font-size: 10.5px;
            }
            .grand-total-box {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border: 2px solid #000;
              padding: 4px 8px;
              font-size: 14px;
              font-weight: 700;
              margin-top: 4px;
            }
            .words-box {
              border: 1px solid #aaa;
              padding: 4px 6px;
              font-size: 10px;
              margin-top: 4px;
              font-weight: 600;
            }
            .balance-row {
              display: flex;
              gap: 16px;
              font-size: 10px;
              margin-top: 4px;
            }
            .for-shop {
              font-size: 10px;
              text-align: right;
              margin-top: 8px;
            }
            .footer-note {
              border-top: 1px solid #000;
              margin-top: 8px;
              padding-top: 4px;
              font-size: 9px;
              display: flex;
              justify-content: space-between;
            }

            /* ── Print ── */
            @media print {
              @page { size: A4; margin: 8mm; }
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              .invoice-page { border: none; padding: 0; width: 100%; }
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  if (!invoice) return null;

  // Aggregate taxable amount for footer (sum of lineSubtotals = subTotal)
  const taxableAmount = invoice.subTotal;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto py-8 px-4">
      {/* Control bar — hidden on print */}
      <div className="w-full max-w-4xl mb-4 flex items-center justify-between bg-white rounded-xl px-5 py-3 shadow-md print:hidden">
        <div>
          <h3 className="font-semibold text-gray-800">Invoice Preview</h3>
          <p className="text-xs text-gray-500">{invoice.invoiceNumber}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium"
          >
            ✕ Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 text-white font-medium flex items-center gap-2"
          >
            🖨️ Print Invoice
          </button>
        </div>
      </div>

      {/* ── A4 Invoice Layout ── */}
      <div className="w-full max-w-4xl bg-white shadow-2xl rounded-sm" ref={printRef}>
        <div className="invoice-page p-6 font-sans text-xs text-black">

          {/* ── Shop Header ── */}
          <div className="header-grid grid grid-cols-[1fr_auto] gap-2 mb-1">
            <div className="col-start-1 text-center">
              <div className="shop-name text-lg font-bold tracking-wide">{SHOP.name}</div>
              <div className="text-xs mt-0.5">{SHOP.address}</div>
              <div className="text-xs">{SHOP.pro}</div>
              <div className="text-xs">{SHOP.mob2}</div>
            </div>
            <div className="text-right text-xs">
              <div className="font-bold">GSTIN : {SHOP.gstin}</div>
              <div className="text-gray-500 text-[9px] mt-1">{SHOP.lcid1}</div>
              <div className="text-gray-500 text-[9px]">{SHOP.lcid2}</div>
              <div className="text-gray-500 text-[9px]">{SHOP.lcid3}</div>
            </div>
          </div>

          <div className="border-t-2 border-b-2 border-black py-0.5 mb-2" />

          {/* ── Customer Row ── */}
          <div className="grid grid-cols-3 gap-x-4 text-xs border-b border-black pb-1.5 mb-2">
            <div>
              <span className="font-bold">Name : </span>{invoice.customerName}
            </div>
            <div>
              <span className="font-bold">Mob : </span>{invoice.mobile}
            </div>
            <div className="grid grid-cols-2">
              <div><span className="font-bold">Bill No : </span>{invoice.invoiceNumber.split('-').pop()}</div>
              <div className="text-right font-bold">[{invoice.paymentMode?.toUpperCase()}] Cash Bill</div>
            </div>
            <div className="col-span-1">
              <span className="font-bold">Address : </span>
            </div>
            <div>
              <span className="font-bold">GSTN : </span>
              {/* B2C — customer GSTIN not required */}
            </div>
            <div>
              <span className="font-bold">Date : </span>
              {fmtDate(invoice.createdAt)}
            </div>
          </div>

          {/* ── Items Table ── */}
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-1 py-1 text-left w-6">Sr.</th>
                <th className="border border-black px-1 py-1 text-left">Product Details</th>
                <th className="border border-black px-1 py-1 text-center w-14">HSN</th>
                <th className="border border-black px-1 py-1 text-center w-16">BATCH</th>
                <th className="border border-black px-1 py-1 text-center w-16">EXPIRY</th>
                <th className="border border-black px-1 py-1 text-center w-8">Qty</th>
                <th className="border border-black px-1 py-1 text-right w-16">Rate</th>
                <th className="border border-black px-1 py-1 text-center w-10">GST %</th>
                <th className="border border-black px-1 py-1 text-right w-16">Rate (With GST)</th>
                <th className="border border-black px-1 py-1 text-right w-16">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => {
                const rateWithGst = item.quantity > 0
                  ? (item.total / item.quantity)
                  : item.price;
                return (
                  <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="border border-black px-1 py-1 text-center">{i + 1}</td>
                    <td className="border border-black px-1 py-1 font-medium">{item.productName}</td>
                    <td className="border border-black px-1 py-1 text-center">{item.hsn || '—'}</td>
                    <td className="border border-black px-1 py-1 text-center">{item.batch || '—'}</td>
                    <td className="border border-black px-1 py-1 text-center">{item.expiry || '—'}</td>
                    <td className="border border-black px-1 py-1 text-right">{item.quantity}.0</td>
                    <td className="border border-black px-1 py-1 text-right">{fmt(item.price)}</td>
                    <td className="border border-black px-1 py-1 text-center">{item.gstRate}.00</td>
                    <td className="border border-black px-1 py-1 text-right">{fmt(rateWithGst)}</td>
                    <td className="border border-black px-1 py-1 text-right font-semibold">{fmt(item.total)}</td>
                  </tr>
                );
              })}
              {/* Empty rows to fill the table — matches sample bill aesthetics */}
              {Array.from({ length: Math.max(0, 5 - invoice.items.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-7">
                  {Array.from({ length: 10 }).map((__, j) => (
                    <td key={j} className="border border-black px-1" />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Footer ── */}
          <div className="grid grid-cols-2 gap-3 mt-2">

            {/* Left: Taxable + GST breakdown + Words + Balance */}
            <div className="space-y-1">
              {/* Tax summary row */}
              <div className="grid grid-cols-4 border border-black text-[10px]">
                <div className="border-r border-black px-1 py-0.5 font-bold">Taxable</div>
                <div className="border-r border-black px-1 py-0.5 font-mono">{fmt(taxableAmount)}</div>
                <div className="border-r border-black px-1 py-0.5 font-bold">CGST</div>
                <div className="px-1 py-0.5 font-mono">{fmt(invoice.cgstTotal)}</div>
              </div>
              <div className="grid grid-cols-4 border border-black text-[10px]">
                <div className="border-r border-black px-1 py-0.5" />
                <div className="border-r border-black px-1 py-0.5" />
                <div className="border-r border-black px-1 py-0.5 font-bold">SGST</div>
                <div className="px-1 py-0.5 font-mono">{fmt(invoice.sgstTotal)}</div>
              </div>

              {/* Amount in words */}
              <div className="border border-gray-400 px-2 py-1 text-[9.5px] font-semibold mt-1">
                Bill In Words: <span className="italic">{invoice.amountInWords || ''}</span>
              </div>

              {/* Balance row */}
              <div className="flex gap-4 text-[10px] mt-1 font-medium">
                <span>Op Bal: {fmt(invoice.openingBalance)}</span>
                <span>Dr-Inv: {fmt(invoice.drInvoice)}</span>
                <span>ClBalance. : <strong>{fmt(invoice.closingBalance)}</strong></span>
              </div>
            </div>

            {/* Right: Net Total + Signature */}
            <div className="flex flex-col justify-between">
              <div className="flex justify-between items-center border-2 border-black px-3 py-2">
                <span className="font-bold text-sm">Net Total :</span>
                <span className="font-bold text-2xl">
                  {Number(invoice.grandTotal).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-right text-[9px] mt-2 text-gray-600">
                <div>For {SHOP.name.split(' ').slice(0, 3).join(' ')}</div>
                <div>Krushi Seva</div>
                <div>Kendra</div>
              </div>
            </div>
          </div>

          {/* ── Page Footer ── */}
          <div className="border-t border-black mt-3 pt-1 flex justify-between text-[9px] text-gray-600">
            <span>This Is Computer Generated Tax Invoice | Subject To Sangola Jurisdiction</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePrint;
