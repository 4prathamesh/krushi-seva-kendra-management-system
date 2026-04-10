const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
    },
    email: { type: String, lowercase: true, trim: true },
    village: { type: String, trim: true },
    taluka: { type: String, trim: true },
    district: { type: String, trim: true },
    landAcres: { type: Number, min: 0 },
    cropTypes: [{ type: String }],   // e.g. ['wheat', 'cotton', 'sugarcane']
    totalPurchases: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0 },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
