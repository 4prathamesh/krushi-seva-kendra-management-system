/**
 * Purchase — stock-in from wholesalers/suppliers.
 *
 * When a purchase is saved, stock for each product increases.
 * This is the counterpart to invoices (which decrease stock).
 */
const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema(
  {
    product:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true }, // snapshot
    quantity:    { type: Number, required: true, min: 1 },
    price:       { type: Number, required: true, min: 0 }, // purchase price per unit
    total:       { type: Number, required: true },         // quantity × price
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    // Auto-generated: PUR-YYYY-NNNN
    purchaseNumber: { type: String, unique: true, required: true },
    
    supplier:        { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },

    // Supplier details (free-text, not linked to a collection)
    supplierName:    { type: String, required: true, trim: true },
    supplierPhone:   { type: String, trim: true, default: '' },
    supplierAddress: { type: String, trim: true, default: '' },

    items: { type: [purchaseItemSchema], required: true },

    totalAmount: { type: Number, required: true },

    // Payment for the purchase itself
    paidAmount:    { type: Number, default: 0 },
    dueAmount:     { type: Number, default: 0 },
    paymentMode:   {
      type: String,
      enum: ['cash', 'upi', 'card', 'credit', 'bank_transfer'],
      default: 'cash',
    },

    purchaseDate: { type: Date, default: Date.now },
    notes:        { type: String, trim: true, default: '' },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

purchaseSchema.index({ purchaseNumber: 1 });
purchaseSchema.index({ createdAt: -1 });
purchaseSchema.index({ supplier: 1 });
purchaseSchema.index({ supplierName: 'text' });

module.exports = mongoose.model('Purchase', purchaseSchema);
