import { body, validationResult } from 'express-validator';
import { sendError } from '../utils/responseHandler.js';

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 422, 'Validation failed', errors.array());
  }
  next();
};

export const productValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('category')
    .isIn(['seed', 'fertilizer', 'pesticide', 'tool', 'other'])
    .withMessage('Invalid category'),
  body('unit')
    .isIn(['kg', 'g', 'litre', 'ml', 'packet', 'bag', 'piece'])
    .withMessage('Invalid unit'),
  body('pricePerUnit').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  handleValidationErrors,
];
