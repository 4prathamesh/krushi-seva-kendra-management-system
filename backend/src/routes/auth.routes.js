import express from 'express';
import { register, login, getMe, changePassword, getAllUsers, updateUser } from '../controllers/auth.controller.js';
import protect, { authorizeRoles } from '../middleware/auth.middleware.js';
import { registerValidation, loginValidation } from '../validations/auth.validation.js';

const router = express.Router();

router.post('/register', protect, authorizeRoles('admin'), registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.get('/users', protect, authorizeRoles('admin'), getAllUsers);
router.put('/users/:id', protect, authorizeRoles('admin'), updateUser);

export default router;
