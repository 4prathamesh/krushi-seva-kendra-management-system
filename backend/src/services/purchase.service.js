'use strict';

const Purchase  = require('../models/purchase.model');
const Product   = require('../models/product.model');
const { generatePurchaseNumber } = require('../utils/purchaseNumber');

// ─── Create purchase (stock in) ───────────────────────────────────────────────
const createPurchase = async ({
  supplierName,
  supplierPhone = '',
  supplierAddress = '',
  items,
  paidAmount = 0,
  paymentMode = 'cash',
  purchaseDate,
  notes = '',
  userId,
}) => {
  // Validate and build items
  const purchaseItems = [];
  let totalAmount = 0;

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product)       throw { status: 404, message: `Product not found: ${item.productId}` };
    if (!product.isActive) throw { status: 400, message: `Product "${product.name}" is inactive` };

    const qty   = Number(item.quantity);
    const price = Number(item.price);
    const total = Math.round(qty * price * 100) / 100;
    totalAmount += total;

    purchaseItems.push({
      product:     product._id,
      productName: product.name,
      quantity:    qty,
      price,
      total,
    });
  }

  totalAmount = Math.round(totalAmount * 100) / 100;
  const paid  = Math.min(Number(paidAmount), totalAmount);
  const due   = Math.round((totalAmount - paid) * 100) / 100;

  const purchaseNumber = await generatePurchaseNumber();

  const purchase = await Purchase.create({
    purchaseNumber,
    supplierName:    supplierName.trim(),
    supplierPhone:   supplierPhone.trim(),
    supplierAddress: supplierAddress.trim(),
    items:           purchaseItems,
    totalAmount,
    paidAmount:      paid,
    dueAmount:       due,
    paymentMode,
    purchaseDate:    purchaseDate ? new Date(purchaseDate) : new Date(),
    notes:           notes.trim(),
    createdBy:       userId,
  });

  // Increase stock for each product (stock in)
  for (const item of purchaseItems) {
    const product = await Product.findById(item.product);
    if (product) {
      product.stock += item.quantity;
      await product.save(); // triggers pre-save stockStatus recalculation
    }
  }

  return purchase;
};

const getAllPurchases = async ({ page = 1, limit = 20, search, from, to } = {}) => {
  const filter = {};
  if (search) {
    const e = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { supplierName:   { $regex: e, $options: 'i' } },
      { purchaseNumber: { $regex: e, $options: 'i' } },
    ];
  }
  if (from || to) {
    filter.purchaseDate = {};
    if (from) filter.purchaseDate.$gte = new Date(from);
    if (to)   filter.purchaseDate.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [purchases, total] = await Promise.all([
    Purchase.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
      .populate('createdBy', 'name').lean(),
    Purchase.countDocuments(filter),
  ]);

  return {
    purchases,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) || 1 },
  };
};

const getPurchaseById = async (id) => {
  const purchase = await Purchase.findById(id).populate('createdBy', 'name').lean();
  if (!purchase) throw { status: 404, message: 'Purchase not found' };
  return purchase;
};

module.exports = { createPurchase, getAllPurchases, getPurchaseById };
