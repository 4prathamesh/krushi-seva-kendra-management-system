import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import productReducer from '../features/products/productSlice';
import orderReducer from '../features/orders/orderSlice';
import customerReducer from '../features/customers/customerSlice';
import invoiceReducer  from '../features/invoices/invoiceSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productReducer,
    orders: orderReducer,
    customers: customerReducer,
    invoices: invoiceReducer,
  },
});
