/**
 * Supplier — wholesalers / distributors the shop buys stock from.
 * Saved once, reused across purchases. Prevents re-typing details every time.
 */
import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true, trim: true, unique: true },
    phone:   { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    gstin:   { type: String, trim: true, default: '' }, // supplier's GSTIN (optional)
    notes:   { type: String, trim: true, default: '' },
    isActive:{ type: Boolean, default: true },
  },
  { timestamps: true }
);

supplierSchema.index({ name: 'text' });

export default mongoose.model('Supplier', supplierSchema);
