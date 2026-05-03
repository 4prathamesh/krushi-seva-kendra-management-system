import express from 'express';
import {
  getAllCustomers,
  getDistinctVillages,
  getCustomerById,
  getCustomerInvoices,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customer.controller.js';
import protect, { authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/villages',        protect, getDistinctVillages);  // dropdown list
router.get('/',                  protect, getAllCustomers);
router.get('/:id',               protect, getCustomerById);
router.get('/:id/invoices',      protect, getCustomerInvoices); 
router.post('/',                 protect, createCustomer);
router.put('/:id',               protect, updateCustomer);
router.delete('/:id',            protect, authorizeRoles('admin'), deleteCustomer);

export default router;
