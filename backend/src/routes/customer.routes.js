const express = require('express');
const router = express.Router();

const {
  getAllCustomers,
  getCustomerById,
  getCustomerInvoices,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require('../controllers/customer.controller');
const { protect, authorizeRoles } = require('../middleware/auth.middleware');

router.get('/',                  protect, getAllCustomers);
router.get('/:id',               protect, getCustomerById);
router.get('/:id/invoices',      protect, getCustomerInvoices); 
router.post('/',                 protect, createCustomer);
router.put('/:id',               protect, updateCustomer);
router.delete('/:id',            protect, authorizeRoles('admin'), deleteCustomer);

module.exports = router;
