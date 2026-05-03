'use strict';

import * as purchaseService from '../services/purchase.service.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

const createPurchase = async (req, res, next) => {
  try {
    const purchase = await purchaseService.createPurchase({ ...req.body, userId: req.user._id });
    return sendSuccess(res, 201, 'Purchase recorded — stock updated', { purchase });
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

const getAllPurchases = async (req, res, next) => {
  try {
    const result = await purchaseService.getAllPurchases(req.query);
    return sendSuccess(res, 200, 'Purchases fetched', result);
  } catch (err) { next(err); }
};

const getPurchaseById = async (req, res, next) => {
  try {
    const purchase = await purchaseService.getPurchaseById(req.params.id);
    return sendSuccess(res, 200, 'Purchase fetched', { purchase });
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

export { createPurchase, getAllPurchases, getPurchaseById };
