/**
 * Product Controller — thin layer.
 * All business logic lives in src/services/product.service.js
 */

const productService = require('../services/product.service');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const getAllProducts = async (req, res, next) => {
  try {
    const result = await productService.getAllProducts(req.query);
    return sendSuccess(res, 200, 'Products fetched', result);
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    return sendSuccess(res, 200, 'Product fetched', { product });
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

const getLowStockProducts = async (req, res, next) => {
  try {
    const products = await productService.getLowStockProducts();
    return sendSuccess(res, 200, 'Low stock products fetched', { products });
  } catch (err) {
    next(err);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const product  = await productService.createProduct({ ...req.body, imageUrl });
    return sendSuccess(res, 201, 'Product created', { product });
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    return sendSuccess(res, 200, 'Product updated', { product });
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

const updateStock = async (req, res, next) => {
  try {
    const product = await productService.updateStock(req.params.id, req.body.stock);
    return sendSuccess(res, 200, 'Stock updated', { product });
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    await productService.deleteProduct(req.params.id);
    return sendSuccess(res, 200, 'Product deleted');
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  getLowStockProducts,
  createProduct,
  updateProduct,
  updateStock,
  deleteProduct,
};
