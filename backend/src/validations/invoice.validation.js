const { body, query, validationResult } = require('express-validator');
const { sendError } = require('../utils/responseHandler');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendError(res, 422, 'Validation failed', errors.array());
  next();
};

const createInvoiceValidation = [
  body('customerName').trim().notEmpty().withMessage('Customer name is required'),
  body('mobile')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Enter a valid 10-digit Indian mobile number'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').notEmpty().withMessage('Product ID required for each item'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('items.*.gstRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('GST rate must be between 0 and 100'),
  body('paymentMode')
    .optional()
    .isIn(['cash', 'upi', 'card', 'mixed', 'none'])
    .withMessage('Payment mode must be cash, upi, card, mixed, or none'),
  body('openingBalance')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Opening balance must be non-negative'),
  handleValidationErrors,
];

module.exports = { createInvoiceValidation };
