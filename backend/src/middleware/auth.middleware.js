import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { sendError } from '../utils/responseHandler.js';

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

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, `Access denied. Required roles: ${roles.join(', ')}`);
    }
    next();
  };
};

export default protect;
