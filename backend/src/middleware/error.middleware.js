'use strict';

import logger from '../utils/logger.js';

const errorMiddleware = (err, req, res, next) => {
  logger.error(`${err.message} | ${req.method} ${req.originalUrl}`);

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

   // ── Mongoose: invalid ObjectId (e.g. /invoices/not-an-id) ────────────────
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    message    = `Invalid ID format for field: ${err.path}`;
  } 

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
    statusCode = 409;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map((e) => e.message).join(', ');
    statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token';
    statusCode = 401;
  }
  if (err.name === 'TokenExpiredError')  { statusCode = 401; message = 'Token expired — please log in again'; }

  // ── CORS error ───────────────────────────────────────────────────────────
  if (err.message?.startsWith('CORS:')) { statusCode = 403; }

  const body = { success: false, message };

  // Only include stack trace in development builds
  if (process.env.NODE_ENV === 'development') {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};

export default errorMiddleware;
