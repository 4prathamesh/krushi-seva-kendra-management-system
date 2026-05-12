/**
 * useInvoices.js — React Query hooks for the Invoices domain
 *
 * WHY: The old invoiceSlice had createAsyncThunk for 4 operations
 * plus a fetchDashboardStats that did NOT belong in the invoice
 * slice conceptually (dashboard is a cross-domain aggregate).
 * Moving everything to React Query:
 *  1. Gives us proper cache invalidation — creating an invoice
 *     invalidates both the invoice list AND the dashboard stats.
 *  2. Removes manual list-patching (unshift, filter) from reducers.
 *  3. Allows the dashboard page to show stale data instantly while
 *     a background refresh happens (stale-while-revalidate).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import invoiceService from '../services/invoice.service';

export const invoiceKeys = {
  all:       ['invoices'],
  list:      (params) => ['invoices', 'list', params],
  detail:    (id)    => ['invoices', 'detail', id],
  dashboard: ()      => ['invoices', 'dashboard'],
  gstReport: (params) => ['invoices', 'gstReport', params],
  lookup:    (mobile) => ['invoices', 'lookup', mobile],
  creditLedger: (customerId) => ['invoices', 'creditLedger', customerId],
};

// ── List with filters / pagination ────────────────────────────────────────────
export const useInvoices = (params = {}) =>
  useQuery({
    queryKey: invoiceKeys.list(params),
    queryFn:  () => invoiceService.getAll(params),
    staleTime: 30_000,
    keepPreviousData: true,
  });

// ── Single invoice ────────────────────────────────────────────────────────────
export const useInvoice = (id) =>
  useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn:  () => invoiceService.getById(id),
    enabled:  !!id,
  });

// ── Dashboard stats ───────────────────────────────────────────────────────────
// Previously lived in invoiceSlice, which polluted the invoice slice
// with unrelated concerns. Now it is its own independent query.
export const useDashboardStats = () =>
  useQuery({
    queryKey: invoiceKeys.dashboard(),
    queryFn:  invoiceService.getDashboardStats,
    staleTime: 60_000, // dashboard can be 1 min stale
    refetchOnWindowFocus: true,
  });

// ── GST report ────────────────────────────────────────────────────────────────
export const useGSTReport = (params = {}) =>
  useQuery({
    queryKey: invoiceKeys.gstReport(params),
    queryFn:  () => invoiceService.getGSTReport(params),
    enabled:  !!(params.startDate && params.endDate),
  });

// ── Lookup by mobile ──────────────────────────────────────────────────────────
export const useLookupByMobile = (mobile) =>
  useQuery({
    queryKey: invoiceKeys.lookup(mobile),
    queryFn:  () => invoiceService.lookupByMobile(mobile),
    enabled:  mobile?.length === 10,
    staleTime: 10_000,
  });

// ── Credit ledger ─────────────────────────────────────────────────────────────
export const useCreditLedger = (customerId) =>
  useQuery({
    queryKey: invoiceKeys.creditLedger(customerId),
    queryFn:  () => invoiceService.getCreditLedger(customerId),
    enabled:  !!customerId,
  });

// ── Create invoice ────────────────────────────────────────────────────────────
export const useCreateInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: invoiceService.create,
    onSuccess: () => {
      // A new invoice affects both the list and the dashboard stats
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      qc.invalidateQueries({ queryKey: invoiceKeys.dashboard() });
    },
  });
};

// ── Cancel invoice ────────────────────────────────────────────────────────────
export const useCancelInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => invoiceService.cancel(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      qc.invalidateQueries({ queryKey: invoiceKeys.dashboard() });
    },
  });
};

// ── Record credit payment ─────────────────────────────────────────────────────
export const useRecordCreditPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: invoiceService.recordCreditPayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      // Also invalidate customers because creditBalance changes
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};
