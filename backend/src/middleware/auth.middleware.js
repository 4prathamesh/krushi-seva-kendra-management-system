const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { sendError } = require('../utils/responseHandler');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return sendError(res, 401, 'Not authorised — no token provided');
    }

    const token   = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      const msg = jwtErr.name === 'TokenExpiredError'
        ? 'Session expired — please log in again'
        : 'Invalid token';
      return sendError(res, 401, msg);
    }

    const user = await User.findById(decoded.id).select('-password').lean();
    if (!user)          return sendError(res, 401, 'User no longer exists');
    if (!user.isActive) return sendError(res, 403, 'Account deactivated — contact admin');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    
    if (!roles.includes(req.body.role || req.user.role)) {
      return sendError(res, 403, `Access denied. Required roles: ${roles.join(', ')}`);
    }
    next();
  };
};

module.exports = { protect, authorizeRoles };
