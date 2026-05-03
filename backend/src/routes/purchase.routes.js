import express from 'express';
import { createPurchase, getAllPurchases, getPurchaseById } from '../controllers/purchase.controller.js';
import protect, { authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/',    protect, getAllPurchases);
router.get('/:id', protect, getPurchaseById);
router.post('/',   protect, authorizeRoles('admin'), createPurchase); // admin only

export default router;
