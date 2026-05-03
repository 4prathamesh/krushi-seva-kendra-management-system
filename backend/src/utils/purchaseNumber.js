import Purchase from '../models/purchase.model.js';

export const generatePurchaseNumber = async () => {
  const year   = new Date().getFullYear();
  const prefix = `PUR-${year}-`;

  const last = await Purchase.findOne(
    { purchaseNumber: { $regex: `^${prefix}` } },
    { purchaseNumber: 1 },
    { sort: { purchaseNumber: -1 } }
  );

  let nextSeq = 1;
  if (last) {
    const parts = last.purchaseNumber.split('-');
    nextSeq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
};
