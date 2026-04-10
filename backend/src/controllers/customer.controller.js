const Customer = require('../models/customer.model');
const Order = require('../models/order.model');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Protected
const getAllCustomers = async (req, res, next) => {
  try {
    const { search, village, page = 1, limit = 10 } = req.query;

    const filter = { isActive: true };
    if (village) filter.village = { $regex: village, $options: 'i' };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [customers, total] = await Promise.all([
      Customer.find(filter).sort({ name: 1 }).skip(skip).limit(Number(limit)),
      Customer.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, 'Customers fetched', {
      customers,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Protected
const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return sendError(res, 404, 'Customer not found');
    return sendSuccess(res, 200, 'Customer fetched', { customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer order history
// @route   GET /api/customers/:id/orders
// @access  Protected
const getCustomerOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.params.id })
      .populate('items.product', 'name unit')
      .sort({ createdAt: -1 });
    return sendSuccess(res, 200, 'Customer orders fetched', { orders });
  } catch (error) {
    next(error);
  }
};

// @desc    Create customer
// @route   POST /api/customers
// @access  Protected
const createCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.create(req.body);
    return sendSuccess(res, 201, 'Customer created', { customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Protected
const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!customer) return sendError(res, 404, 'Customer not found');
    return sendSuccess(res, 200, 'Customer updated', { customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete customer
// @route   DELETE /api/customers/:id
// @access  Admin
const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!customer) return sendError(res, 404, 'Customer not found');
    return sendSuccess(res, 200, 'Customer deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  getCustomerOrders,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
