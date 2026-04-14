/**
 * Invoice Service — all business logic lives here.
 * Controllers stay thin: validate → call service → send response.
 *
 * Responsibilities:
 *   - GST line-item calculation
 *   - Stock validation and deduction (transactional-style)
 *   - Invoice number generation
 *   - Invoice creation, retrieval, cancellation
 *   - Search & date-range filter
 *   - GST aggregate report
 */

const Invoice  = require('../models/invoice.model');
const Product  = require('../models/product.model');
const Customer = require('../models/customer.model');
const mongoose = require('mongoose');
const { calcLineGST, calcOrderTotals } = require('../utils/gst');
const { generateInvoiceNumber }        = require('../utils/invoiceNumber');
const { amountInWords }                = require('../utils/amountInWords');

// ─────────────────────────────────────────────────────────────────────────────
// buildInvoiceItems
//   Validates each item, checks stock, calculates GST, builds the array.
//   Does NOT deduct stock — that happens only after the invoice is persisted
//   so we can roll back cleanly if the DB write fails.
// ─────────────────────────────────────────────────────────────────────────────
const buildInvoiceItems = async (items) => {
  const invoiceItems = [];
  const gstLines     = [];
  const stockUpdates = []; // [{product, qty}] — applied after DB save

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) {
      throw { status: 404, message: `Product not found: ${item.productId}` };
    }
    if (!product.isActive) {
      throw { status: 400, message: `Product "${product.name}" is inactive` };
    }
    if (product.stock < Number(item.quantity)) {
      throw {
        status: 400,
        message: `Insufficient stock for "${product.name}". Available: ${product.stock} ${product.unit}`,
      };
    }

    // Allow per-item price / gstRate overrides (e.g. negotiated price);
    // otherwise fall back to product-level defaults
    const price   = item.price   !== undefined ? Number(item.price)   : product.pricePerUnit;
    const gstRate = item.gstRate !== undefined ? Number(item.gstRate) : product.gstRate;
    const qty     = Number(item.quantity);

    const { gstAmount, cgst, sgst, lineSubtotal, lineTotal } = calcLineGST(price, qty, gstRate);

    invoiceItems.push({
      product:     product._id,
      productName: product.name,
      hsn:    item.hsn    || product.hsn    || '',
      batch:  item.batch  || product.batch  || '',
      expiry: item.expiry || product.expiry || '',
      quantity: qty,
      price,
      gstRate,
      gstAmount,
      cgst,
      sgst,
      total: lineTotal,
    });

    gstLines.push({ lineSubtotal, cgst, sgst, lineTotal });
    stockUpdates.push({ product, qty });
  }

  return { invoiceItems, gstLines, stockUpdates };
};

// ─────────────────────────────────────────────────────────────────────────────
// deductStock  — called AFTER the invoice is saved successfully
// ─────────────────────────────────────────────────────────────────────────────
const deductStock = async (stockUpdates) => {
  for (const { product, qty } of stockUpdates) {
    product.stock -= qty;
    await product.save(); // triggers pre-save stockStatus update
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// restoreStock — called when an invoice is cancelled
// ─────────────────────────────────────────────────────────────────────────────
const restoreStock = async (items) => {
  for (const item of items) {
    if (item.product) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// buildFilter — shared between getAllInvoices and getGSTReport
// ─────────────────────────────────────────────────────────────────────────────
const buildFilter = ({ search, mobile, paymentMode, status, from, to } = {}) => {
  const filter = { isCancelled: false };

  if (mobile) {
    filter.mobile = { $regex: mobile.trim(), $options: 'i' };
  }

  if (paymentMode) {
    filter.paymentMode = paymentMode;
  }

  if (status) {
    filter.status = status;
  }

  // Case-insensitive customer name / invoice number / mobile search
  if (search) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { customerName:  { $regex: escaped, $options: 'i' } },
      { invoiceNumber: { $regex: escaped, $options: 'i' } },
      { mobile:        { $regex: escaped, $options: 'i' } },
    ];
  }

  // Date range (inclusive of full `to` day)
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
  }

  return filter;
};

// ─────────────────────────────────────────────────────────────────────────────
// createInvoice
// ─────────────────────────────────────────────────────────────────────────────

const createInvoice = async (data) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      customerName,
      mobile,
      customerId,
      items,
      paymentMode = 'cash',
      openingBalance = 0,
      userId,
    } = data;

    let linkedCustomer = null;
    const customerPhone = mobile.trim();
    const customerNameTrimmed = customerName.trim();

    // 1. Customer handling
    if (customerId) {
      linkedCustomer = await Customer.findById(customerId).session(session);
      if (!linkedCustomer) throw { status: 404, message: 'Customer not found' };
    } else {
      linkedCustomer = await Customer.findOne({ phone: customerPhone }).session(session);
    }

    if (!linkedCustomer) {
      linkedCustomer = await Customer.create([{
        name: customerNameTrimmed,
        phone: customerPhone,
      }], { session });

      linkedCustomer = linkedCustomer[0];
    }

    // 2. Build items
    const { invoiceItems, gstLines, stockUpdates } = await buildInvoiceItems(items);

    // 3. Totals
    const { subTotal, cgstTotal, sgstTotal, totalGST, grandTotal } = calcOrderTotals(gstLines);

    const drInvoice = grandTotal;
    const closingBalance = Number(openingBalance) + drInvoice;

    // 4. Invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // 5. Create invoice
    const invoice = await Invoice.create([{
      invoiceNumber,
      customerName: customerNameTrimmed,
      mobile: customerPhone,
      customer: linkedCustomer._id,
      items: invoiceItems,
      subTotal,
      totalGST,
      cgstTotal,
      sgstTotal,
      grandTotal,
      paymentMode,
      status: 'paid',
      openingBalance: Number(openingBalance),
      drInvoice,
      closingBalance,
      createdBy: userId,
    }], { session });

    // 6. Deduct stock
    await deductStock(stockUpdates, session);

    // 7. Update customer
    await Customer.findByIdAndUpdate(
      linkedCustomer._id,
      { $inc: { totalPurchases: grandTotal } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    const result = invoice[0].toObject();
    result.amountInWords = amountInWords(grandTotal);

    return result;

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// getAllInvoices — paginated list with search + filters
// ─────────────────────────────────────────────────────────────────────────────
const getAllInvoices = async ({
  page = 1,
  limit = 20,
  search,
  mobile,
  paymentMode,
  status,
  from,
  to,
} = {}) => {
  const filter = buildFilter({ search, mobile, paymentMode, status, from, to });
  const skip   = (Number(page) - 1) * Number(limit);

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('createdBy', 'name')
      .lean(), // lean() for read-only list — faster than full Mongoose docs
    Invoice.countDocuments(filter),
  ]);

  return {
    invoices,
    pagination: {
      total,
      page:  Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// getInvoiceById — single invoice with amountInWords
// ─────────────────────────────────────────────────────────────────────────────
const getInvoiceById = async (id) => {
  const invoice = await Invoice.findById(id)
    .populate('createdBy', 'name')
    .lean();
  if (!invoice) throw { status: 404, message: 'Invoice not found' };
  invoice.amountInWords = amountInWords(invoice.grandTotal);
  return invoice;
};

// ─────────────────────────────────────────────────────────────────────────────
// cancelInvoice — soft-cancel, restore stock
// ─────────────────────────────────────────────────────────────────────────────
const cancelInvoice = async (id, reason = 'Cancelled by admin') => {
  const invoice = await Invoice.findById(id);
  if (!invoice)            throw { status: 404, message: 'Invoice not found' };
  if (invoice.isCancelled) throw { status: 400, message: 'Invoice already cancelled' };

  await restoreStock(invoice.items);

  invoice.isCancelled  = true;
  invoice.cancelReason = reason;
  invoice.status       = 'cancelled';
  await invoice.save();

  return { invoiceNumber: invoice.invoiceNumber };
};

// ─────────────────────────────────────────────────────────────────────────────
// getGSTReport — aggregate summary for a date range
// ─────────────────────────────────────────────────────────────────────────────
const getGSTReport = async ({ from, to } = {}) => {
  const filter = buildFilter({ from, to });

  const [summary] = await Invoice.aggregate([
    { $match: filter },
    {
      $group: {
        _id:           null,
        totalInvoices: { $sum: 1 },
        subTotal:      { $sum: '$subTotal' },
        cgstTotal:     { $sum: '$cgstTotal' },
        sgstTotal:     { $sum: '$sgstTotal' },
        totalGST:      { $sum: '$totalGST' },
        grandTotal:    { $sum: '$grandTotal' },
      },
    },
  ]);

  return summary || {
    totalInvoices: 0,
    subTotal: 0,
    cgstTotal: 0,
    sgstTotal: 0,
    totalGST: 0,
    grandTotal: 0,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// getDashboardStats — replaces the old Order-based dashboard
// ─────────────────────────────────────────────────────────────────────────────
const getDashboardStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const Customer = require('../models/customer.model');

  const [
    totalInvoices,
    todayInvoices,
    revenueResult,
    totalCustomers,
    lowStockCount,
  ] = await Promise.all([
    Invoice.countDocuments({ isCancelled: false }),
    Invoice.countDocuments({ isCancelled: false, createdAt: { $gte: today } }),
    Invoice.aggregate([
      { $match: { isCancelled: false } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]),
    Customer.countDocuments({ isActive: true }),
    Product.countDocuments({
      isActive: true,
      stockStatus: { $in: ['low_stock', 'out_of_stock'] },
    }),
  ]);

  return {
    totalInvoices,
    todayInvoices,
    totalRevenue:  revenueResult[0]?.total || 0,
    totalCustomers,
    lowStockCount,
  };
};

module.exports = {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  cancelInvoice,
  getGSTReport,
  getDashboardStats,
};
