const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { sendError } = require('../utils/responseHandler');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'Not authorized, no token');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    console.log('Decoded user: ', user);
    if (!user || !user.isActive) {
      return sendError(res, 401, 'User not found or deactivated');
    }

    req.user = user;
    next();
  } catch (error) {
    return sendError(res, 401, 'Token invalid or expired');
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    console.log('user role: ', req.body);
    if (!roles.includes(req.body.role || req.user.role)) {
      return sendError(res, 403, `Access denied. Required roles: ${roles.join(', ')}`);
    }
    next();
  };
};

module.exports = { protect, authorizeRoles };
