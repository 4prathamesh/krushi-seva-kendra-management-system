const express = require('express');
const router = express.Router();

const { register, login, getMe, changePassword } = require('../controllers/auth.controller');
const { protect, authorizeRoles } = require('../middleware/auth.middleware');
const { registerValidation, loginValidation } = require('../validations/auth.validation');

router.post('/register', authorizeRoles('admin'), registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);

module.exports = router;
