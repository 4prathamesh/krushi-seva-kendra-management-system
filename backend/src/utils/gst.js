/**
 * GST Calculation Utilities — B2C same-state only (CGST + SGST, no IGST)
 *
 * Formula per the spec:
 *   gstAmount  = price × quantity × (gstRate / 100)
 *   cgst       = gstAmount / 2
 *   sgst       = gstAmount / 2
 *   lineTotal  = (price × quantity) + gstAmount
 */

/**
 * Calculate GST for a single line item.
 * All monetary values rounded to 2 decimal places.
 *
 * @param {number} price      - Unit price (base rate, pre-GST)
 * @param {number} quantity   - Quantity sold
 * @param {number} gstRate    - GST percentage (e.g. 12, 18)
 * @returns {{ gstAmount, cgst, sgst, lineSubtotal, lineTotal }}
 */
export const calcLineGST = (price, quantity, gstRate) => {
  const lineSubtotal = round2(price * quantity);
  const gstAmount    = round2(lineSubtotal * (gstRate / 100));
  const cgst         = round2(gstAmount / 2);
  const sgst         = round2(gstAmount / 2);
  // Re-derive cgst+sgst from halved values to avoid floating-point drift
  const lineTotal    = round2(lineSubtotal + cgst + sgst);
  return { gstAmount: round2(cgst + sgst), cgst, sgst, lineSubtotal, lineTotal };
};

/**
 * Aggregate totals across all processed line items.
 *
 * @param {Array} lines  - Array of objects with { lineSubtotal, cgst, sgst, lineTotal }
 * @returns {{ subTotal, cgstTotal, sgstTotal, totalGST, grandTotal }}
 */
export const calcOrderTotals = (lines) => {
  const subTotal  = round2(lines.reduce((s, l) => s + l.lineSubtotal, 0));
  const cgstTotal = round2(lines.reduce((s, l) => s + l.cgst, 0));
  const sgstTotal = round2(lines.reduce((s, l) => s + l.sgst, 0));
  const totalGST  = round2(cgstTotal + sgstTotal);
  const grandTotal = round2(subTotal + totalGST);
  return { subTotal, cgstTotal, sgstTotal, totalGST, grandTotal };
};

export const round2 = (n) => Math.round(n * 100) / 100;
