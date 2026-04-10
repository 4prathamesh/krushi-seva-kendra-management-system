const express = require('express');
const router = express.Router();

const {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  getDashboardStats,
} = require('../controllers/order.controller');
const { protect, authorizeRoles } = require('../middleware/auth.middleware');
const { orderValidation } = require('../validations/order.validation');

router.get('/dashboard', protect, getDashboardStats);
router.get('/', protect, getAllOrders);
router.get('/:id', protect, getOrderById);
router.post('/', protect, orderValidation, createOrder);
router.patch('/:id/status', protect, updateOrderStatus);
router.delete('/:id', protect, authorizeRoles('admin'), cancelOrder);

module.exports = router;
