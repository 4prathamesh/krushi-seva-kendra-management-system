import mongoose from 'mongoose';
import { STOCK_STATUS } from '../constants/status.js';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['seed', 'fertilizer', 'pesticide', 'tool', 'other'],
      required: [true, 'Category is required'],
    },
    description: { type: String, trim: true },
    brand: { type: String, trim: true },
    unit: {
      type: String,
      enum: ['kg', 'g', 'litre', 'ml', 'packet', 'bag', 'piece'],
      required: true,
    },
    pricePerUnit: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
    },
    stockStatus: {
      type: String,
      enum: Object.values(STOCK_STATUS),
      default: STOCK_STATUS.IN_STOCK,
    },
    imageUrl: { type: String },
    
    // ── NEW: GST / billing fields ─────────────────────────────────────────────
    hsn:     { type: String, trim: true, default: '' },  // HSN / SAC code
    gstRate: { type: Number, default: 0, min: 0, max: 100 }, // e.g. 12, 18
    batch:   { type: String, trim: true, default: '' },  // current batch number
    expiry:  { type: String, trim: true, default: '' },  // e.g. "Feb 2026"
    // ─────────────────────────────────────────────────────────────────────────

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Auto-update stockStatus before save
productSchema.pre('save', function (next) {
  if (this.stock === 0) {
    this.stockStatus = STOCK_STATUS.OUT_OF_STOCK;
  } else if (this.stock <= this.lowStockThreshold) {
    this.stockStatus = STOCK_STATUS.LOW_STOCK;
  } else {
    this.stockStatus = STOCK_STATUS.IN_STOCK;
  }
  next();
});

export default mongoose.model('Product', productSchema);
