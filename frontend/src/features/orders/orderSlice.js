import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import orderService from '../../services/order.service';

export const fetchOrders = createAsyncThunk('orders/fetchAll', async (params, thunkAPI) => {
  try {
    return await orderService.getAll(params);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to fetch orders');
  }
});

export const createOrder = createAsyncThunk('orders/create', async (data, thunkAPI) => {
  try {
    return await orderService.create(data);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to create order');
  }
});

export const updateOrderStatus = createAsyncThunk('orders/updateStatus', async ({ id, data }, thunkAPI) => {
  try {
    return await orderService.updateStatus(id, data);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to update order');
  }
});

export const cancelOrder = createAsyncThunk('orders/cancel', async (id, thunkAPI) => {
  try {
    await orderService.cancel(id);
    return id;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to cancel order');
  }
});

export const fetchDashboardStats = createAsyncThunk('orders/dashboard', async (_, thunkAPI) => {
  try {
    return await orderService.getDashboard();
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to fetch stats');
  }
});

const orderSlice = createSlice({
  name: 'orders',
  initialState: {
    items: [],
    pagination: {},
    dashboard: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => { state.loading = true; })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.orders;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.items.unshift(action.payload.order);
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const idx = state.items.findIndex(o => o._id === action.payload.order._id);
        if (idx !== -1) state.items[idx] = action.payload.order;
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        const idx = state.items.findIndex(o => o._id === action.payload);
        if (idx !== -1) state.items[idx] = { ...state.items[idx], orderStatus: 'cancelled' };
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.dashboard = action.payload;
      });
  },
});

export const { clearError } = orderSlice.actions;
export default orderSlice.reducer;
