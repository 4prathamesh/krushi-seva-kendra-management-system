'use strict';

const Invoice           = require('../models/invoice.model');
const Product           = require('../models/product.model');
const Customer          = require('../models/customer.model');
const CreditTransaction = require('../models/credit.model');
const { calcLineGST, calcOrderTotals } = require('../utils/gst');
const { generateInvoiceNumber }        = require('../utils/invoiceNumber');
const { amountInWords }                = require('../utils/amountInWords');

// ─── 1. SMART CUSTOMER LOOKUP / AUTO-CREATE ──────────────────────────────────
/**
 * findOrCreateCustomer
 *
 * Priority: mobile number lookup (unique) → name lookup → create new.
 * Returns the Customer document (existing or freshly created).
 * Never creates a duplicate phone entry.
 */
const findOrCreateCustomer = async ({ mobile, customerName, village = '', taluka = '', district = '' }) => {
  // Always search by mobile first (unique field)
  let customer = await Customer.findOne({ phone: mobile.trim() });

  if (!customer) {
    // Try name match as fallback (case-insensitive, exact phone not found)
    // Not used for creation decision — just informational
    // We always create when phone not found to avoid silent merging
    customer = await Customer.create({
      name:     customerName.trim(),
      phone:    mobile.trim(),
      village:  village.trim()  || '',
      taluka:   taluka.trim()   || '',
      district: district.trim() || '',
    });
  }

  return customer;
};

// ─── 2. BUILD INVOICE LINE ITEMS (validate + GST, no stock deduction yet) ────
const buildInvoiceItems = async (items) => {
  const invoiceItems = [];
  const gstLines     = [];
  const stockUpdates = [];

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product)       throw { status: 404, message: `Product not found: ${item.productId}` };
    if (!product.isActive) throw { status: 400, message: `Product "${product.name}" is inactive` };
    if (product.stock < Number(item.quantity)) {
      throw {
        status: 400,
        message: `Insufficient stock for "${product.name}". Available: ${product.stock} ${product.unit}`,
      };
    }

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

// ─── 3. STOCK HELPERS ────────────────────────────────────────────────────────
const deductStock = async (stockUpdates) => {
  for (const { product, qty } of stockUpdates) {
    product.stock -= qty;
    await product.save();
  }
};

const restoreStock = async (items) => {
  for (const item of items) {
    if (item.product) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }
  }
};

// ─── 4. PAYMENT STATUS RESOLVER ──────────────────────────────────────────────
const resolvePaymentStatus = (grandTotal, paidAmount) => {
  const paid = Math.round(Number(paidAmount) * 100) / 100;
  const due  = Math.round((grandTotal - paid) * 100) / 100;

  let paymentStatus;
  if (paid <= 0)            paymentStatus = 'credit';   // udhar — nothing paid
  else if (due <= 0)        paymentStatus = 'paid';     // fully paid
  else                      paymentStatus = 'partial';  // partial payment

  return { paid, due: Math.max(due, 0), paymentStatus };
};

// ─── 5. CREDIT LEDGER HELPERS ────────────────────────────────────────────────
const chargeCredit = async ({ customerId, invoiceId, amount, note, userId }) => {
  if (amount <= 0) return;
  await CreditTransaction.create({
    customer: customerId,
    invoice:  invoiceId,
    type:     'charge',
    amount,
    note:     note || 'Invoice due amount',
    createdBy: userId,
  });
  await Customer.findByIdAndUpdate(customerId, { $inc: { creditBalance: amount, outstandingBalance: amount } });
  // Recalculate paymentStatus via save (triggers pre-save hook)
  const c = await Customer.findById(customerId);
  await c.save();
};

const applyPayment = async ({ customerId, amount, note, userId }) => {
  if (amount <= 0) return;
  const customer = await Customer.findById(customerId);
  if (!customer) throw { status: 404, message: 'Customer not found' };

  const applied = Math.min(amount, customer.creditBalance); // never reduce below 0
  if (applied <= 0) throw { status: 400, message: 'Customer has no outstanding credit balance' };

  await CreditTransaction.create({
    customer: customerId,
    type:     'payment',
    amount:   applied,
    note:     note || 'Credit payment received',
    createdBy: userId,
  });

  customer.creditBalance = Math.max(0, customer.creditBalance - applied);
  await customer.save(); // triggers pre-save paymentStatus update
  return { applied, remainingCredit: customer.creditBalance };
};

// ─── 6. CREATE INVOICE ────────────────────────────────────────────────────────
const createInvoice = async ({
  customerName,
  mobile,
  village  = '',
  taluka   = '',
  district = '',
  paidAmount = 0,
  paymentMode = 'cash',
  items,
  userId,
}) => {
  // Step 1: Smart customer lookup / auto-create
  const customer = await findOrCreateCustomer({ mobile, customerName, village, taluka, district });

  // Step 2: Build line items (validate stock + GST, no deduction yet)
  const { invoiceItems, gstLines, stockUpdates } = await buildInvoiceItems(items);

  // Step 3: Aggregate GST totals
  const { subTotal, cgstTotal, sgstTotal, totalGST, grandTotal } = calcOrderTotals(gstLines);

  // Step 4: Resolve payment status
  const { paid, due, paymentStatus } = resolvePaymentStatus(grandTotal, paidAmount);

  // Step 5: Balance footer for printed bill
  const openingBal     = customer.creditBalance || 0;
  const drInvoice      = due;
  const closingBalance = openingBal + due; // closing = opening credit + new due

  // Step 6: Payment mode — force 'none' when credit, keep provided mode otherwise
  const resolvedPaymentMode = paymentStatus === 'credit' ? 'none' : paymentMode;

  // Step 7: Invoice status mirrors payment status
  const invoiceStatus = paymentStatus === 'paid' ? 'paid'
                      : paymentStatus === 'partial' ? 'partial'
                      : 'credit';

  // Step 8: Generate invoice number
  const invoiceNumber = await generateInvoiceNumber();

  // Step 9: Save invoice
  const invoice = await Invoice.create({
    invoiceNumber,
    customerName: customer.name,
    mobile:       customer.phone,
    customer:     customer._id,
    items:        invoiceItems,
    subTotal,
    totalGST,
    cgstTotal,
    sgstTotal,
    grandTotal,
    paidAmount:   paid,
    dueAmount:    due,
    paymentStatus,
    paymentMode:  resolvedPaymentMode,
    status:       invoiceStatus,
    openingBalance: openingBal,
    drInvoice,
    closingBalance,
    createdBy: userId,
  });

  // Step 10: Deduct stock (only after DB write succeeds)
  await deductStock(stockUpdates);

  // Step 11: Update customer purchase totals
  await Customer.findByIdAndUpdate(customer._id, {
    $inc: { totalPurchases: grandTotal },
  });

  // Step 12: Record credit charge if there's a due amount
  if (due > 0) {
    await chargeCredit({
      customerId: customer._id,
      invoiceId:  invoice._id,
      amount:     due,
      note:       `Due from invoice ${invoiceNumber}`,
      userId,
    });
  }

  const data = invoice.toObject();
  data.amountInWords = amountInWords(grandTotal);
  data.customerDetails = { _id: customer._id, name: customer.name, phone: customer.phone, village: customer.village, creditBalance: customer.creditBalance };
  return data;
};

// ─── 7. LOOKUP CUSTOMER BY MOBILE (for frontend auto-fill) ───────────────────
const lookupCustomerByMobile = async (mobile) => {
  const customer = await Customer.findOne({ phone: mobile.trim() }).lean();
  return customer || null;
};

// ─── 8. RECORD A CREDIT PAYMENT ──────────────────────────────────────────────
const recordCreditPayment = async ({ customerId, amount, note, userId }) => {
  return applyPayment({ customerId, amount: Number(amount), note, userId });
};

// ─── 9. GET CREDIT LEDGER FOR A CUSTOMER ─────────────────────────────────────
const getCreditLedger = async (customerId) => {
  const [customer, transactions] = await Promise.all([
    Customer.findById(customerId).lean(),
    CreditTransaction.find({ customer: customerId })
      .sort({ createdAt: -1 })
      .populate('invoice', 'invoiceNumber grandTotal')
      .lean(),
  ]);
  if (!customer) throw { status: 404, message: 'Customer not found' };
  return { customer, transactions };
};

// ─── 10. GET ALL INVOICES ─────────────────────────────────────────────────────
const buildFilter = ({ search, mobile, paymentMode, paymentStatus, status, from, to } = {}) => {
  const filter = { isCancelled: false };
  if (mobile)        filter.mobile = { $regex: mobile.trim(), $options: 'i' };
  if (paymentMode)   filter.paymentMode   = paymentMode;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (status)        filter.status        = status;
  if (search) {
    const e = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { customerName:  { $regex: e, $options: 'i' } },
      { invoiceNumber: { $regex: e, $options: 'i' } },
      { mobile:        { $regex: e, $options: 'i' } },
    ];
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
  }
  return filter;
};

const getAllInvoices = async ({ page = 1, limit = 20, ...filters } = {}) => {
  const filter = buildFilter(filters);
  const skip   = (Number(page) - 1) * Number(limit);
  const [invoices, total] = await Promise.all([
    Invoice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
      .populate('createdBy', 'name').lean(),
    Invoice.countDocuments(filter),
  ]);
  return {
    invoices,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) || 1 },
  };
};

const getInvoiceById = async (id) => {
  const invoice = await Invoice.findById(id).populate('createdBy', 'name').populate('customer', 'name phone village creditBalance').lean();
  if (!invoice) throw { status: 404, message: 'Invoice not found' };
  invoice.amountInWords = amountInWords(invoice.grandTotal);
  return invoice;
};

const cancelInvoice = async (id, reason = 'Cancelled by admin') => {
  const invoice = await Invoice.findById(id);
  if (!invoice)            throw { status: 404, message: 'Invoice not found' };
  if (invoice.isCancelled) throw { status: 400, message: 'Invoice already cancelled' };

  await restoreStock(invoice.items);

  // Reverse credit charge if the invoice had a due amount
  if (invoice.dueAmount > 0 && invoice.customer) {
    const customer = await Customer.findById(invoice.customer);
    if (customer) {
      customer.creditBalance = Math.max(0, customer.creditBalance - invoice.dueAmount);
      await customer.save();
      await CreditTransaction.create({
        customer: invoice.customer,
        invoice:  invoice._id,
        type:     'payment',
        amount:   invoice.dueAmount,
        note:     `Credit reversed — invoice ${invoice.invoiceNumber} cancelled`,
      });
    }
  }

  invoice.isCancelled  = true;
  invoice.cancelReason = reason;
  invoice.status       = 'cancelled';
  await invoice.save();
  return { invoiceNumber: invoice.invoiceNumber };
};

const getGSTReport = async ({ from, to } = {}) => {
  const filter = buildFilter({ from, to });
  const [summary] = await Invoice.aggregate([
    { $match: filter },
    { $group: {
      _id: null,
      totalInvoices: { $sum: 1 },
      subTotal:      { $sum: '$subTotal' },
      cgstTotal:     { $sum: '$cgstTotal' },
      sgstTotal:     { $sum: '$sgstTotal' },
      totalGST:      { $sum: '$totalGST' },
      grandTotal:    { $sum: '$grandTotal' },
      totalPaid:     { $sum: '$paidAmount' },
      totalDue:      { $sum: '$dueAmount' },
    }},
  ]);
  return summary || { totalInvoices:0, subTotal:0, cgstTotal:0, sgstTotal:0, totalGST:0, grandTotal:0, totalPaid:0, totalDue:0 };
};

const getDashboardStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [totalInvoices, todayInvoices, revenueResult, totalCustomers, lowStockCount, totalDue] = await Promise.all([
    Invoice.countDocuments({ isCancelled: false }),
    Invoice.countDocuments({ isCancelled: false, createdAt: { $gte: today } }),
    Invoice.aggregate([{ $match: { isCancelled: false } }, { $group: { _id: null, total: { $sum: '$grandTotal' }, paid: { $sum: '$paidAmount' } } }]),
    Customer.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: true, stockStatus: { $in: ['low_stock', 'out_of_stock'] } }),
    Customer.aggregate([{ $match: { isActive: true } }, { $group: { _id: null, total: { $sum: '$creditBalance' } } }]),
  ]);
  return {
    totalInvoices,
    todayInvoices,
    totalRevenue:  revenueResult[0]?.total  || 0,
    totalCollected: revenueResult[0]?.paid  || 0,
    totalCustomers,
    lowStockCount,
    totalOutstanding: totalDue[0]?.total || 0,
  };
};

module.exports = {
  createInvoice,
  lookupCustomerByMobile,
  recordCreditPayment,
  getCreditLedger,
  getAllInvoices,
  getInvoiceById,
  cancelInvoice,
  getGSTReport,
  getDashboardStats,
};
