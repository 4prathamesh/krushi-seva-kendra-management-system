const { body, validationResult } = require('express-validator');
const { sendError } = require('../utils/responseHandler');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 422, 'Validation failed', errors.array());
  }
  next();
};

const orderValidation = [
  body('customer').notEmpty().withMessage('Customer ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').notEmpty().withMessage('Product ID is required for each item'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('orderType').optional().isIn(['online', 'offline']).withMessage('Invalid order type'),
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'upi', 'credit', 'bank_transfer'])
    .withMessage('Invalid payment method'),
  handleValidationErrors,
];

module.exports = { orderValidation };
