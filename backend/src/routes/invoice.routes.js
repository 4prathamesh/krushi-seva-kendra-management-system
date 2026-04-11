const express = require('express');
const router  = express.Router();

const {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  cancelInvoice,
  getGSTReport,
} = require('../controllers/invoice.controller');

const { protect, authorizeRoles } = require('../middleware/auth.middleware');
const { createInvoiceValidation } = require('../validations/invoice.validation');

// GST report must come before /:id to avoid route shadowing
router.get('/gst-report', protect, authorizeRoles('admin'), getGSTReport);

router.get('/',    protect, getAllInvoices);
router.get('/:id', protect, getInvoiceById);
router.post('/',   protect, createInvoiceValidation, createInvoice);
router.delete('/:id', protect, authorizeRoles('admin'), cancelInvoice);

module.exports = router;
