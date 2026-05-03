/**
 * Invoice Controller — thin layer.
 * Parse request → call invoiceService → send response.
 * All business logic lives in src/services/invoice.service.js
 */

import * as invoiceService from '../services/invoice.service.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/invoices
// ─────────────────────────────────────────────────────────────────────────────
const createInvoice = async (req, res, next) => {
  try {
    const invoice = await invoiceService.createInvoice({ ...req.body, userId: req.user._id });

    return sendSuccess(res, 201, 'Invoice created', { invoice });
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    // Unique-index race condition on invoiceNumber
    if (err.code === 11000) return sendError(res, 409, 'Invoice number conflict — please retry');
    next(err);
  }
};

// GET /api/invoices/lookup?mobile=9876543210
const lookupCustomer = async (req, res, next) => {
  try {
    const { mobile } = req.query;
    if (!mobile) return sendError(res, 400, 'Mobile number is required');
    const customer = await invoiceService.lookupCustomerByMobile(mobile);
    return sendSuccess(res, 200, customer ? 'Customer found' : 'Customer not found', { customer });
  } catch (err) {
    next(err);
  }
};

// POST /api/invoices/credit-payment
const recordCreditPayment = async (req, res, next) => {
  try {
    const { customerId, amount, note } = req.body;
    if (!customerId || !amount) return sendError(res, 400, 'customerId and amount are required');
    const result = await invoiceService.recordCreditPayment({ customerId, amount, note, userId: req.user._id });
    return sendSuccess(res, 200, `Payment of ₹${result.applied} recorded. Remaining credit: ₹${result.remainingCredit}`, result);
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

// GET /api/invoices/credit-ledger/:customerId
const getCreditLedger = async (req, res, next) => {
  try {
    const data = await invoiceService.getCreditLedger(req.params.customerId);
    return sendSuccess(res, 200, 'Credit ledger fetched', data);
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invoices
// Query params: page, limit, search, mobile, paymentMode, status, from, to
// ─────────────────────────────────────────────────────────────────────────────
const getAllInvoices = async (req, res, next) => {
  try {
    const result = await invoiceService.getAllInvoices(req.query);
    return sendSuccess(res, 200, 'Invoices fetched', result);
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invoices/:id
// ─────────────────────────────────────────────────────────────────────────────
const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id);
    return sendSuccess(res, 200, 'Invoice fetched', { invoice });
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/invoices/:id   (admin only — soft cancel + stock restore)
// ─────────────────────────────────────────────────────────────────────────────
const cancelInvoice = async (req, res, next) => {
  try {
    const result = await invoiceService.cancelInvoice(
      req.params.id,
      req.body.reason
    );
    return sendSuccess(res, 200, `Invoice ${result.invoiceNumber} cancelled — stock restored`);
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invoices/gst-report   (admin only)
// Query params: from, to
// ─────────────────────────────────────────────────────────────────────────────
const getGSTReport = async (req, res, next) => {
  try {
    const report = await invoiceService.getGSTReport(req.query);
    return sendSuccess(res, 200, 'GST report fetched', { report });
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invoices/dashboard-stats   (replaces old order-based dashboard)
// ─────────────────────────────────────────────────────────────────────────────
const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await invoiceService.getDashboardStats();
    return sendSuccess(res, 200, 'Dashboard stats fetched', stats);
  } catch (err) {
    next(err);
  }
};

export {
  createInvoice, 
  lookupCustomer, 
  recordCreditPayment, 
  getCreditLedger,
  getAllInvoices,
  getInvoiceById,
  cancelInvoice,
  getGSTReport,
  getDashboardStats,
};
