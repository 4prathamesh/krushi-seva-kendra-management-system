import express from 'express';
import {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  getDashboardStats,
} from '../controllers/order.controller.js';
import protect, { authorizeRoles } from '../middleware/auth.middleware.js';
import { orderValidation } from '../validations/order.validation.js';

const router = express.Router();

router.get('/dashboard', protect, getDashboardStats);
router.get('/', protect, getAllOrders);
router.get('/:id', protect, getOrderById);
router.post('/', protect, orderValidation, createOrder);
router.patch('/:id/status', protect, updateOrderStatus);
router.delete('/:id', protect, authorizeRoles('admin'), cancelOrder);

export default router;
