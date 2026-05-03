import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  getLowStockProducts,
} from '../controllers/product.controller.js';
import protect, { authorizeRoles } from '../middleware/auth.middleware.js';
import { productValidation } from '../validations/product.validation.js';

const router = express.Router();

// Multer config for product images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) =>
    cb(null, `product-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB

router.get('/low-stock', protect, getLowStockProducts);
router.get('/', protect, getAllProducts);
router.get('/:id', protect, getProductById);
router.post('/', protect, authorizeRoles('admin'), upload.single('image'), productValidation, createProduct);
router.put('/:id', protect, authorizeRoles('admin'), updateProduct);
router.patch('/:id/stock', protect, updateStock);
router.delete('/:id', protect, authorizeRoles('admin'), deleteProduct);

export default router;
