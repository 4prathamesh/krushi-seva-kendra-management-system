import express from 'express';
import { getAllSuppliers, createSupplier, updateSupplier } from '../controllers/supplier.controller.js';
import protect, { authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/',    protect, getAllSuppliers);
router.post('/',   protect, authorizeRoles('admin'), createSupplier);
router.put('/:id', protect, authorizeRoles('admin'), updateSupplier);

export default router;
