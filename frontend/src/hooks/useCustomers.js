/**
 * useCustomers.js — React Query hooks for the Customers domain
 *
 * WHY THIS REPLACES customerSlice:
 *  - The old slice had 4 createAsyncThunk definitions + 4 sets of
 *    pending/fulfilled/rejected cases = ~60 lines of boilerplate for
 *    what is essentially "fetch list, add item, edit item, delete item".
 *  - React Query collapses all of that into simple useMutation calls
 *    while adding features the thunk approach didn't have:
 *    automatic retries, background refetch, request deduplication.
 *
 *  - The `villages` endpoint was previously called with a raw `api.get`
 *    inside a useEffect in Customers.jsx. It's now a proper named query,
 *    which means it gets caching, deduplication, and error handling for free.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import customerService from '../services/customer.service';
import api from '../services/api';

export const customerKeys = {
  all:      ['customers'],
  list:     (params) => ['customers', 'list', params],
  detail:   (id)    => ['customers', 'detail', id],
  invoices: (id)    => ['customers', 'invoices', id],
  villages: ()      => ['customers', 'villages'],
};

// ── List ─────────────────────────────────────────────────────────────────────
export const useCustomers = (params = {}) =>
  useQuery({
    queryKey: customerKeys.list(params),
    queryFn:  () => customerService.getAll(params),
    staleTime: 30_000,
    keepPreviousData: true,
  });

// ── Single customer ───────────────────────────────────────────────────────────
export const useCustomer = (id) =>
  useQuery({
    queryKey: customerKeys.detail(id),
    queryFn:  () => customerService.getById(id),
    enabled:  !!id,
  });

// ── Customer invoices ─────────────────────────────────────────────────────────
export const useCustomerInvoices = (id) =>
  useQuery({
    queryKey: customerKeys.invoices(id),
    queryFn:  () => customerService.getInvoices(id),
    enabled:  !!id,
  });

// ── Villages dropdown data ────────────────────────────────────────────────────
// Previously: raw api.get inside a useEffect in Customers.jsx.
// Now: a proper cached query that any component can reuse.
export const useVillages = () =>
  useQuery({
    queryKey: customerKeys.villages(),
    queryFn:  async () => {
      const r = await api.get('/customers/villages');
      return r.data.data.villages || [];
    },
    staleTime: 5 * 60_000, // villages rarely change — cache 5 min
  });

// ── Create ────────────────────────────────────────────────────────────────────
export const useCreateCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: customerService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.all }),
  });
};

// ── Update ────────────────────────────────────────────────────────────────────
export const useUpdateCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => customerService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.all }),
  });
};

// ── Delete ────────────────────────────────────────────────────────────────────
export const useDeleteCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => customerService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.all }),
  });
};
