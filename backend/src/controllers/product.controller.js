const Product = require('../models/product.model');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// @desc    Get all products (with filters, search, pagination)
// @route   GET /api/products
// @access  Protected
const getAllProducts = async (req, res, next) => {
  try {
    const { category, stockStatus, search, page = 1, limit = 10 } = req.query;

    const filter = { isActive: true };
    if (category) filter.category = category;
    if (stockStatus) filter.stockStatus = stockStatus;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Product.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, 'Products fetched', {
      products,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Protected
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return sendError(res, 404, 'Product not found');
    return sendSuccess(res, 200, 'Product fetched', { product });
  } catch (error) {
    next(error);
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Admin
const createProduct = async (req, res, next) => {
  try {
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const product = await Product.create({ ...req.body, imageUrl });
    return sendSuccess(res, 201, 'Product created', { product });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Admin
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return sendError(res, 404, 'Product not found');
    return sendSuccess(res, 200, 'Product updated', { product });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete (soft) product
// @route   DELETE /api/products/:id
// @access  Admin
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!product) return sendError(res, 404, 'Product not found');
    return sendSuccess(res, 200, 'Product deleted');
  } catch (error) {
    next(error);
  }
};

// @desc    Update stock only
// @route   PATCH /api/products/:id/stock
// @access  Protected
const updateStock = async (req, res, next) => {
  try {
    const { stock } = req.body;
    if (stock === undefined) return sendError(res, 400, 'Stock value is required');

    const product = await Product.findById(req.params.id);
    if (!product) return sendError(res, 404, 'Product not found');

    product.stock = stock;
    await product.save(); // triggers pre-save for stockStatus

    return sendSuccess(res, 200, 'Stock updated', { product });
  } catch (error) {
    next(error);
  }
};

// @desc    Get low stock products
// @route   GET /api/products/low-stock
// @access  Protected
const getLowStockProducts = async (req, res, next) => {
  try {
    const products = await Product.find({
      isActive: true,
      stockStatus: { $in: ['low_stock', 'out_of_stock'] },
    }).sort({ stock: 1 });
    return sendSuccess(res, 200, 'Low stock products fetched', { products });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  getLowStockProducts,
};
