import mongoose from 'mongoose';

// ─── GST Item Schema ──────────────────────────────────────────────────────────
// Extends the plain order item with GST-specific fields required for the bill
const invoiceItemSchema = new mongoose.Schema({
  product:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String, required: true },   // snapshot at invoice time
  hsn:         { type: String, default: '' },       // HSN code from product
  batch:       { type: String, default: '' },       // batch number
  expiry:      { type: String, default: '' },       // expiry date (string, e.g. "Feb 2026")
  quantity:    { type: Number, required: true, min: 1 },
  price:       { type: Number, required: true },    // price per unit (pre-GST / inclusive — treated as base rate here)
  gstRate:     { type: Number, required: true, default: 0 }, // e.g. 12, 18
  gstAmount:   { type: Number, required: true },    // total GST for this line
  cgst:        { type: Number, required: true },    // gstAmount / 2
  sgst:        { type: Number, required: true },    // gstAmount / 2
  total:       { type: Number, required: true },    // (price × qty) + gstAmount
  },
  { _id: false }
);

// ─── Invoice Schema ───────────────────────────────────────────────────────────
const invoiceSchema = new mongoose.Schema(
  {
    // INV-YYYY-0001 format, unique per year, auto-generated in controller
    invoiceNumber: { type: String, unique: true, required: true },

    // B2C: customer name + mobile only — GSTIN not required
    customerName: { type: String, required: true, trim: true },
    mobile:       { type: String, required: true, trim: true },

    // Optional link to Customer document if customer is registered
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },

    items: { type: [invoiceItemSchema], required: true },

    subTotal:   { type: Number, required: true }, // sum of (price × qty) across all items
    totalGST:   { type: Number, required: true }, // sum of all gstAmount
    cgstTotal:  { type: Number, required: true }, // totalGST / 2
    sgstTotal:  { type: Number, required: true }, // totalGST / 2
    grandTotal: { type: Number, required: true }, // subTotal + totalGST

    paymentMode: {
      type: String,
      enum: ['cash', 'upi', 'card', 'mixed', 'none'],
      default: 'cash',
    },

    paidAmount: { type: Number, required: true, default: 0 },
    dueAmount:  { type: Number, required: true, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['paid', 'partial', 'credit'],
      default: 'paid',
    },

    status: {
      type: String,
      enum: ['draft', 'paid', 'partial', 'credit', 'cancelled'],
      default: 'paid',
    },

    // For balance tracking shown on bill footer
    openingBalance: { type: Number, default: 0 }, // "Op Bal" on the sample bill
    drInvoice:      { type: Number, default: 0 },  // invoice debit amount
    closingBalance: { type: Number, default: 0 }, // "ClBalance"

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Soft-cancel: cancelled invoices are kept for audit trail
    isCancelled: { type: Boolean, default: false },
    cancelReason: { type: String, default: '' },
  },
  { timestamps: true }
);

// Index for fast year-based sequence lookups
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ mobile: 1 });
invoiceSchema.index({ customer: 1, createdAt: -1 });
invoiceSchema.index({ customerName: 'text', invoiceNumber: 'text', mobile: 'text' });
invoiceSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Invoice', invoiceSchema);
