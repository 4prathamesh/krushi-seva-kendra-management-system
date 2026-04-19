const express = require('express');
const router  = express.Router();
const { getAllSuppliers, createSupplier, updateSupplier } = require('../controllers/supplier.controller');
const { protect, authorizeRoles } = require('../middleware/auth.middleware');

router.get('/',    protect, getAllSuppliers);
router.post('/',   protect, authorizeRoles('admin'), createSupplier);
router.put('/:id', protect, authorizeRoles('admin'), updateSupplier);

module.exports = router;
