/**
 * Auth Controller — thin layer.
 * All business logic lives in src/services/auth.service.js
 */

import * as authService from '../services/auth.service.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

export const register = async (req, res, next) => {
  try {
    const result = await authService.registerUser(req.body);
    return sendSuccess(res, 201, 'User registered successfully', result);
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await authService.loginUser(req.body);
    return sendSuccess(res, 200, 'Login successful', result);
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'Profile fetched', { user: req.user });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    await authService.changePassword(req.user._id, req.body);
    return sendSuccess(res, 200, 'Password changed successfully');
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await authService.getAllUsers();
    return sendSuccess(res, 200, 'Users fetched', { users });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await authService.updateUser(req.params.id, req.user._id, req.body);
    return sendSuccess(res, 200, 'User updated', { user });
  } catch (err) {
    if (err.status) return sendError(res, err.status, err.message);
    next(err);
  }
};
