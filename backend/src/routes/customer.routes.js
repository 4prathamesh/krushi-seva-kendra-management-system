const express = require('express');
const router = express.Router();

const {
  getAllCustomers,
  getCustomerById,
  getCustomerOrders,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require('../controllers/customer.controller');
const { protect, authorizeRoles } = require('../middleware/auth.middleware');

router.get('/', protect, getAllCustomers);
router.get('/:id', protect, getCustomerById);
router.get('/:id/orders', protect, getCustomerOrders);
router.post('/', protect, createCustomer);
router.put('/:id', protect, updateCustomer);
router.delete('/:id', protect, authorizeRoles('admin'), deleteCustomer);

module.exports = router;
