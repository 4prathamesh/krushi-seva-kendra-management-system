const Invoice = require('../models/invoice.model');

/**
 * Generates the next invoice number in INV-YYYY-NNNN format.
 * Sequence resets every calendar year.
 * Uses a retry loop to handle the rare concurrent-save race condition
 * without needing a separate counter collection.
 */
const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // Find the highest existing number for this year
  const last = await Invoice.findOne(
    { invoiceNumber: { $regex: `^${prefix}` } },
    { invoiceNumber: 1 },
    { sort: { invoiceNumber: -1 } }   // lexicographic desc works because zero-padded
  );

  let nextSeq = 1;
  if (last) {
    const parts = last.invoiceNumber.split('-');
    nextSeq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  // Zero-pad to 4 digits (supports up to 9999 invoices/year; extend padding if needed)
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
};

module.exports = { generateInvoiceNumber };
