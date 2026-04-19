'use strict';

const supplierService = require('../services/supplier.service');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const getAllSuppliers = async (req, res, next) => {
  try {
    const suppliers = await supplierService.getAllSuppliers(req.query);
    return sendSuccess(res, 200, 'Suppliers fetched', { suppliers });
  } catch (err) { next(err); }
};

const createSupplier = async (req, res, next) => {
  try {
    const supplier = await supplierService.createSupplier(req.body);
    return sendSuccess(res, 201, 'Supplier created', { supplier });
  } catch (err) {
    if (err.code === 11000) return sendError(res, 409, 'Supplier with this name already exists');
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await supplierService.updateSupplier(req.params.id, req.body);
    return sendSuccess(res, 200, 'Supplier updated', { supplier });
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

module.exports = { getAllSuppliers, createSupplier, updateSupplier };
