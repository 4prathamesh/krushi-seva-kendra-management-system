const express = require('express');
const router  = express.Router();

const {
  createInvoice, 
  lookupCustomer, 
  recordCreditPayment, 
  getCreditLedger,
  getAllInvoices,
  getInvoiceById,
  cancelInvoice,
  getGSTReport,
  getDashboardStats,
} = require('../controllers/invoice.controller');

const { protect, authorizeRoles } = require('../middleware/auth.middleware');
const { createInvoiceValidation } = require('../validations/invoice.validation');

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

module.exports = router;
