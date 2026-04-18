/**
 * Customer Service — business logic for farmer/customer CRUD.
 */

const Customer = require('../models/customer.model');

const escapeRegex = (text) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const buildFilter = ({ search, village, hasUdhar } = {}) => {
  const filter = { isActive: true };

  if (village) {
    const safeVillage = escapeRegex(village.trim());

    filter.village = {
      $regex: safeVillage,
      $options: 'i'
    };
  }

  if (hasUdhar === 'true' || hasUdhar === true){
    filter.creditBalance = { $gt: 0 };
  }

  if (search) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name:  { $regex: escaped, $options: 'i' } },
      { phone: { $regex: escaped, $options: 'i' } },
    ];
  }
  return filter;
};

const getAllCustomers = async ({ search, village, hasUdhar, page = 1, limit = 10 } = {}) => {
  const filter = buildFilter({ search, village, hasUdhar });
  const skip   = (Number(page) - 1) * Number(limit);

  const [customers, total] = await Promise.all([
    Customer.find(filter).sort({ name: 1 }).skip(skip).limit(Number(limit)).lean(),
    Customer.countDocuments(filter),
  ]);

  return {
    customers,
    pagination: {
      total,
      page:  Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

// Used to populate the village filter dropdown on the frontend
const getDistinctVillages = async () => {
  const villages = await Customer.distinct('village', {
    isActive: true,
    village: { $ne: '', $exists: true, $ne: null },
  });
  return villages.filter(Boolean).sort();
};

const getCustomerById = async (id) => {
  const customer = await Customer.findById(id);
  if (!customer) throw { status: 404, message: 'Customer not found' };
  return customer;
};

const getCustomerInvoices = async (customerId) => {
  // Use Invoice model to get purchase history for a customer
  const Invoice = require('../models/invoice.model');
  return Invoice.find({ customer: customerId, isCancelled: false })
    .sort({ createdAt: -1 })
    .lean();
};

const createCustomer = async (data) => {
  return Customer.create(data);
};

const updateCustomer = async (id, data) => {
  const customer = await Customer.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!customer) throw { status: 404, message: 'Customer not found' };
  return customer;
};

const deleteCustomer = async (id) => {
  const customer = await Customer.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );
  if (!customer) throw { status: 404, message: 'Customer not found' };
  return customer;
};

module.exports = {
  getAllCustomers,
  getDistinctVillages,
  getCustomerById,
  getCustomerInvoices,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
