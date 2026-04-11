import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import customerService from '../../services/customer.service';

export const fetchCustomers = createAsyncThunk('customers/fetchAll', async (params, thunkAPI) => {
  try {
    return await customerService.getAll(params);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to fetch customers');
  }
});

export const createCustomer = createAsyncThunk('customers/create', async (data, thunkAPI) => {
  try {
    return await customerService.create(data);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to create customer');
  }
});

export const updateCustomer = createAsyncThunk('customers/update', async ({ id, data }, thunkAPI) => {
  try {
    return await customerService.update(id, data);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to update customer');
  }
});

export const deleteCustomer = createAsyncThunk('customers/delete', async (id, thunkAPI) => {
  try {
    await customerService.delete(id);
    return id;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to delete customer');
  }
});

const customerSlice = createSlice({
  name: 'customers',
  initialState: {
    items: [],
    pagination: {},
    loading: false,
    error: null,
  },
  reducers: {
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending,   (state) => { state.loading = true; state.error = null; })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.customers;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchCustomers.rejected,  (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.items.unshift(action.payload.customer);
        state.pagination.total = (state.pagination.total || 0) + 1;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        const idx = state.items.findIndex(c => c._id === action.payload.customer._id);
        if (idx !== -1) state.items[idx] = action.payload.customer;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.items = state.items.filter(c => c._id !== action.payload);
      });
  },
});

export const { clearError } = customerSlice.actions;
export default customerSlice.reducer;
