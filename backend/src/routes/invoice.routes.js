import express from 'express';
import {
  createInvoice, 
  lookupCustomer, 
  recordCreditPayment, 
  getCreditLedger,
  getAllInvoices,
  getInvoiceById,
  cancelInvoice,
  getGSTReport,
  getDashboardStats,
} from '../controllers/invoice.controller.js';
import protect, { authorizeRoles } from '../middleware/auth.middleware.js';
import { createInvoiceValidation } from '../validations/invoice.validation.js';

const router = express.Router();

// GST report must come before /:id to avoid route shadowing
router.get('/dashboard-stats', protect, getDashboardStats);
router.get('/gst-report', protect, authorizeRoles('admin'), getGSTReport);
router.get('/lookup',                      protect, lookupCustomer);               // ?mobile=
router.get('/credit-ledger/:customerId',   protect, getCreditLedger);
router.post('/credit-payment',             protect, recordCreditPayment);

router.get('/',    protect, getAllInvoices);
router.get('/:id', protect, getInvoiceById);
router.post('/',   protect, createInvoiceValidation, createInvoice);
router.delete('/:id', protect, authorizeRoles('admin'), cancelInvoice);

export default router;
