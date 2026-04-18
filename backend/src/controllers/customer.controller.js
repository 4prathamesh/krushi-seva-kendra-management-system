/**
 * Customer Controller — thin layer.
 * All business logic lives in src/services/customer.service.js
 */

const customerService = require('../services/customer.service');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const getAllCustomers = async (req, res, next) => {
  try {
    console.log('Fetching customers with query:', req.query);
    const result = await customerService.getAllCustomers(req.query);
    console.log('Fetched customers:', result);
    return sendSuccess(res, 200, 'Customers fetched', result);
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

// GET /customers/villages — distinct village list for filter dropdown
const getDistinctVillages = async (req, res, next) => {
  try {
    const villages = await customerService.getDistinctVillages();
    return sendSuccess(res, 200, 'Villages fetched', { villages });
  } catch (err) { next(err); }
};

const getCustomerById = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    return sendSuccess(res, 200, 'Customer fetched', { customer });
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

// Returns invoice history for a customer (replaces old "getCustomerOrders")
const getCustomerInvoices = async (req, res, next) => {
  try {
    const invoices = await customerService.getCustomerInvoices(req.params.id);
    return sendSuccess(res, 200, 'Customer invoices fetched', { invoices });
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

const createCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.createCustomer(req.body);
    return sendSuccess(res, 201, 'Customer created', { customer });
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body);
    return sendSuccess(res, 200, 'Customer updated', { customer });
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

const deleteCustomer = async (req, res, next) => {
  try {
    await customerService.deleteCustomer(req.params.id);
    return sendSuccess(res, 200, 'Customer deleted');
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
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
