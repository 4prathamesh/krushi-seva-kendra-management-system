const Order = require('../models/order.model');
const Product = require('../models/product.model');
const Customer = require('../models/customer.model');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// @desc    Get all orders
// @route   GET /api/orders
// @access  Protected
const getAllOrders = async (req, res, next) => {
  try {
    const { orderStatus, paymentStatus, orderType, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (orderStatus) filter.orderStatus = orderStatus;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (orderType) filter.orderType = orderType;

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customer', 'name phone village')
        .populate('items.product', 'name unit')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, 'Orders fetched', {
      orders,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Protected
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name phone village')
      .populate('items.product', 'name unit category');
    if (!order) return sendError(res, 404, 'Order not found');
    return sendSuccess(res, 200, 'Order fetched', { order });
  } catch (error) {
    next(error);
  }
};

// @desc    Create order
// @route   POST /api/orders
// @access  Protected
const createOrder = async (req, res, next) => {
  try {
    const { customer, items, orderType, paymentMethod, discountAmount = 0, notes } = req.body;

    // Validate customer
    const customerDoc = await Customer.findById(customer);
    if (!customerDoc) return sendError(res, 404, 'Customer not found');

    // Build order items & deduct stock
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return sendError(res, 404, `Product ${item.product} not found`);
      if (product.stock < item.quantity) {
        return sendError(res, 400, `Insufficient stock for ${product.name}`);
      }

      const subtotal = product.pricePerUnit * item.quantity;
      totalAmount += subtotal;

      orderItems.push({
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        pricePerUnit: product.pricePerUnit,
        subtotal,
      });

      // Deduct stock
      product.stock -= item.quantity;
      await product.save();
    }

    const finalAmount = totalAmount - discountAmount;

    const order = await Order.create({
      customer,
      items: orderItems,
      totalAmount,
      discountAmount,
      finalAmount,
      orderType,
      paymentMethod,
      notes,
      createdBy: req.user._id,
    });

    // Update customer total purchases
    await Customer.findByIdAndUpdate(customer, {
      $inc: { totalPurchases: finalAmount },
    });

    const populated = await order.populate('customer', 'name phone');
    return sendSuccess(res, 201, 'Order created', { order: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Protected
const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus, paymentStatus } = req.body;
    const update = {};
    if (orderStatus) update.orderStatus = orderStatus;
    if (paymentStatus) update.paymentStatus = paymentStatus;

    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!order) return sendError(res, 404, 'Order not found');
    return sendSuccess(res, 200, 'Order status updated', { order });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel order (restore stock)
// @route   DELETE /api/orders/:id
// @access  Admin
const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return sendError(res, 404, 'Order not found');
    if (order.orderStatus === 'cancelled') {
      return sendError(res, 400, 'Order already cancelled');
    }

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }

    order.orderStatus = 'cancelled';
    await order.save();

    return sendSuccess(res, 200, 'Order cancelled and stock restored');
  } catch (error) {
    next(error);
  }
};

// @desc    Dashboard summary
// @route   GET /api/orders/dashboard
// @access  Protected
const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalOrders, todayOrders, totalRevenue, pendingOrders, totalCustomers] =
      await Promise.all([
        Order.countDocuments(),
        Order.countDocuments({ createdAt: { $gte: today } }),
        Order.aggregate([
          { $match: { orderStatus: { $ne: 'cancelled' } } },
          { $group: { _id: null, total: { $sum: '$finalAmount' } } },
        ]),
        Order.countDocuments({ orderStatus: 'pending' }),
        Customer.countDocuments({ isActive: true }),
      ]);

    return sendSuccess(res, 200, 'Dashboard stats fetched', {
      totalOrders,
      todayOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      pendingOrders,
      totalCustomers,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  getDashboardStats,
};
