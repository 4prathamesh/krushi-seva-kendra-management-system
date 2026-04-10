const mongoose = require('mongoose');
const { STOCK_STATUS } = require('../constants/status');

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

module.exports = mongoose.model('Product', productSchema);
