const express = require('express');
const router  = express.Router();
const { createPurchase, getAllPurchases, getPurchaseById } = require('../controllers/purchase.controller');
const { protect, authorizeRoles } = require('../middleware/auth.middleware');

router.get('/',    protect, getAllPurchases);
router.get('/:id', protect, getPurchaseById);
router.post('/',   protect, authorizeRoles('admin'), createPurchase); // admin only

module.exports = router;
