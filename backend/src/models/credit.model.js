/**
 * CreditTransaction — ledger for customer credit (Udhar) movements.
 *
 * type:
 *   'charge'  — amount added to credit (invoice with dueAmount > 0)
 *   'payment' — amount cleared from credit (customer pays later)
 *
 * Each entry is append-only. Current credit balance is maintained on the
 * Customer document (creditBalance) for fast reads. This ledger provides
 * the full audit trail.
 */
import mongoose from 'mongoose';

const creditSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    // invoice is set for 'charge' entries; optional for manual adjustments
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null,
    },
    type: {
      type: String,
      enum: ['charge', 'payment'],
      required: true,
    },
    amount:  { type: Number, required: true, min: 0 },
    note:    { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

creditSchema.index({ customer: 1, createdAt: -1 });
creditSchema.index({ invoice: 1 });

export default mongoose.model('CreditTransaction', creditSchema);
