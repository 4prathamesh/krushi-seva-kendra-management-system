const Invoice  = require('../models/invoice.model');
const Product  = require('../models/product.model');
const Customer = require('../models/customer.model');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { generateInvoiceNumber }  = require('../utils/invoiceNumber');
const { calcLineGST, calcOrderTotals } = require('../utils/gst');
const { amountInWords } = require('../utils/amountInWords');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Create a new GST invoice (B2C)
// @route   POST /api/invoices
// @access  Protected
// ─────────────────────────────────────────────────────────────────────────────
const createInvoice = async (req, res, next) => {
  try {
    const {
      customerName,
      mobile,
      customerId,       // optional — if customer is in DB
      items,            // [{ productId, quantity, price?, gstRate?, batch?, expiry? }]
      paymentMode = 'cash',
      openingBalance = 0,
    } = req.body;

    if (!items || items.length === 0)
      return sendError(res, 400, 'At least one item is required');

    // ── Build invoice line items & deduct stock ───────────────────────────────
    const invoiceItems = [];
    const gstLines = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return sendError(res, 404, `Product ${item.productId} not found`);

      // Stock validation — prevents overselling
      if (product.stock < item.quantity) {
        return sendError(res, 400, `Insufficient stock for "${product.name}". Available: ${product.stock} ${product.unit}`);
      }

      // Use request-level overrides if provided (e.g. negotiated price), else fall back to product defaults
      const price   = item.price   !== undefined ? Number(item.price)   : product.pricePerUnit;
      const gstRate = item.gstRate !== undefined ? Number(item.gstRate) : product.gstRate;
      const qty     = Number(item.quantity);

      const { gstAmount, cgst, sgst, lineSubtotal, lineTotal } = calcLineGST(price, qty, gstRate);

      invoiceItems.push({
        product:     product._id,
        productName: product.name,
        hsn:   item.hsn   || product.hsn   || '',
        batch: item.batch || product.batch || '',
        expiry:item.expiry|| product.expiry|| '',
        quantity: qty,
        price,
        gstRate,
        gstAmount,
        cgst,
        sgst,
        total: lineTotal,
      });

      gstLines.push({ lineSubtotal, cgst, sgst, lineTotal });

      // Deduct stock immediately on invoice creation
      product.stock -= qty;
      await product.save();
    }

    const { subTotal, cgstTotal, sgstTotal, totalGST, grandTotal } = calcOrderTotals(gstLines);

    // Balance calculation (mirrors the sample bill's Op Bal / Dr-Inv / ClBalance)
    const drInvoice      = grandTotal;
    const closingBalance = Number(openingBalance) + drInvoice;

    // Auto-generate invoice number (INV-YYYY-NNNN) — duplicate prevention via unique index
    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await Invoice.create({
      invoiceNumber,
      customerName,
      mobile,
      customer:  customerId || null,
      items:     invoiceItems,
      subTotal,
      totalGST,
      cgstTotal,
      sgstTotal,
      grandTotal,
      paymentMode,
      openingBalance: Number(openingBalance),
      drInvoice,
      closingBalance,
      createdBy: req.user._id,
    });

    // If linked to a Customer document, update their purchase total
    if (customerId) {
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { totalPurchases: grandTotal },
      });
    }

    // Attach words for the frontend invoice print view
    const populated = invoice.toObject();
    populated.amountInWords = amountInWords(grandTotal);

    return sendSuccess(res, 201, 'Invoice created', { invoice: populated });
  } catch (error) {
    // Unique-index violation = duplicate invoice number (race condition)
    if (error.code === 11000) {
      return sendError(res, 409, 'Invoice number conflict — please retry');
    }
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all invoices (paginated, filterable)
// @route   GET /api/invoices
// @access  Protected
// ─────────────────────────────────────────────────────────────────────────────
const getAllInvoices = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, mobile, paymentMode, from, to, search } = req.query;

    const filter = { isCancelled: false };
    if (mobile)      filter.mobile      = { $regex: mobile, $options: 'i' };
    if (paymentMode) filter.paymentMode = paymentMode;
    if (search)      filter.$or = [
      { invoiceNumber: { $regex: search, $options: 'i' } },
      { customerName:  { $regex: search, $options: 'i' } },
      { mobile:        { $regex: search, $options: 'i' } },
    ];

    // Date range filter
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('createdBy', 'name'),
      Invoice.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, 'Invoices fetched', {
      invoices,
      pagination: {
        total,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get single invoice by ID
// @route   GET /api/invoices/:id
// @access  Protected
// ─────────────────────────────────────────────────────────────────────────────
const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('createdBy', 'name');
    if (!invoice) return sendError(res, 404, 'Invoice not found');

    const data = invoice.toObject();
    data.amountInWords = amountInWords(invoice.grandTotal);

    return sendSuccess(res, 200, 'Invoice fetched', { invoice: data });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Cancel invoice (soft delete, restore stock)
// @route   DELETE /api/invoices/:id
// @access  Admin
// ─────────────────────────────────────────────────────────────────────────────
const cancelInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice)             return sendError(res, 404, 'Invoice not found');
    if (invoice.isCancelled)  return sendError(res, 400, 'Invoice already cancelled');

    // Restore stock for all line items
    for (const item of invoice.items) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
      }
    }

    invoice.isCancelled  = true;
    invoice.cancelReason = req.body.reason || 'Cancelled by admin';
    await invoice.save();

    return sendSuccess(res, 200, 'Invoice cancelled and stock restored');
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    GST summary report (daily/monthly totals)
// @route   GET /api/invoices/gst-report
// @access  Admin
// ─────────────────────────────────────────────────────────────────────────────
const getGSTReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const matchStage = { isCancelled: false };
    if (from || to) {
      matchStage.createdAt = {};
      if (from) matchStage.createdAt.$gte = new Date(from);
      if (to)   matchStage.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    const [summary] = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          subTotal:      { $sum: '$subTotal' },
          cgstTotal:     { $sum: '$cgstTotal' },
          sgstTotal:     { $sum: '$sgstTotal' },
          totalGST:      { $sum: '$totalGST' },
          grandTotal:    { $sum: '$grandTotal' },
        },
      },
    ]);

    return sendSuccess(res, 200, 'GST report fetched', { report: summary || {} });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  cancelInvoice,
  getGSTReport,
};
