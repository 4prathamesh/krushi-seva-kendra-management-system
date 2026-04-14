/**
 * Product Service — business logic for product CRUD and stock management.
 * Controller stays thin: parse request → call service → send response.
 */

const Product = require('../models/product.model');

// ─────────────────────────────────────────────────────────────────────────────
// buildFilter — shared query builder
// ─────────────────────────────────────────────────────────────────────────────
const buildFilter = ({ search, category, stockStatus } = {}) => {
  const filter = { isActive: true };
  if (category)    filter.category    = category;
  if (stockStatus) filter.stockStatus = stockStatus;
  if (search) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.name   = { $regex: escaped, $options: 'i' };
  }
  return filter;
};

// ─────────────────────────────────────────────────────────────────────────────
// getAllProducts — paginated list with search + category + stock filter
// ─────────────────────────────────────────────────────────────────────────────
const getAllProducts = async ({ search, category, stockStatus, page = 1, limit = 10 } = {}) => {
  const filter = buildFilter({ search, category, stockStatus });
  const skip   = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Product.countDocuments(filter),
  ]);

  return {
    products,
    pagination: {
      total,
      page:  Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// getProductById
// ─────────────────────────────────────────────────────────────────────────────
const getProductById = async (id) => {
  const product = await Product.findById(id);
  if (!product) throw { status: 404, message: 'Product not found' };
  return product;
};

// ─────────────────────────────────────────────────────────────────────────────
// getLowStockProducts
// ─────────────────────────────────────────────────────────────────────────────
const getLowStockProducts = async () => {
  return Product.find({
    isActive: true,
    stockStatus: { $in: ['low_stock', 'out_of_stock'] },
  }).sort({ stock: 1 }).lean();
};

// ─────────────────────────────────────────────────────────────────────────────
// createProduct
// ─────────────────────────────────────────────────────────────────────────────
const createProduct = async (data) => {
  return Product.create(data);
};

// ─────────────────────────────────────────────────────────────────────────────
// updateProduct
// ─────────────────────────────────────────────────────────────────────────────
const updateProduct = async (id, data) => {
  const product = await Product.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!product) throw { status: 404, message: 'Product not found' };
  return product;
};

// ─────────────────────────────────────────────────────────────────────────────
// updateStock — dedicated stock adjustment (also used by StockEditModal)
// ─────────────────────────────────────────────────────────────────────────────
const updateStock = async (id, stock) => {
  const product = await Product.findById(id);
  if (!product) throw { status: 404, message: 'Product not found' };
  if (stock === undefined || stock === null)
    throw { status: 400, message: 'Stock value is required' };
  product.stock = Number(stock);
  await product.save(); // triggers pre-save stockStatus recalculation
  return product;
};

// ─────────────────────────────────────────────────────────────────────────────
// deleteProduct — soft delete (isActive = false)
// ─────────────────────────────────────────────────────────────────────────────
const deleteProduct = async (id) => {
  const product = await Product.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );
  if (!product) throw { status: 404, message: 'Product not found' };
  return product;
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
