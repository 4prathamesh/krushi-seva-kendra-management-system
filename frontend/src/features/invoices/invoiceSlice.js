import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import invoiceService from '../../services/invoice.service';

export const fetchInvoices = createAsyncThunk('invoices/fetchAll', async (params, thunkAPI) => {
  try {
    return await invoiceService.getAll(params);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to fetch invoices');
  }
});

export const createInvoice = createAsyncThunk('invoices/create', async (data, thunkAPI) => {
  try {
    return await invoiceService.create(data);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to create invoice');
  }
});

export const cancelInvoice = createAsyncThunk('invoices/cancel', async ({ id, reason }, thunkAPI) => {
  try {
    await invoiceService.cancel(id, reason);
    return id;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to cancel invoice');
  }
});

const invoiceSlice = createSlice({
  name: 'invoices',
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
      .addCase(fetchInvoices.pending,   (state) => { state.loading = true; state.error = null; })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.loading = false;
        state.items      = action.payload.invoices;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchInvoices.rejected,  (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })
      .addCase(createInvoice.fulfilled, (state, action) => {
        state.items.unshift(action.payload.invoice);
      })
      .addCase(cancelInvoice.fulfilled, (state, action) => {
        state.items = state.items.filter(inv => inv._id !== action.payload);
      });
  },
});

export const { clearError } = invoiceSlice.actions;
export default invoiceSlice.reducer;
