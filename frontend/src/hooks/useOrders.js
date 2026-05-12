/**
 * useOrders.js — React Query hooks for the Orders domain
 *
 * WHY: The old orderSlice was never even registered in the Redux
 * store (it was missing from store.js) yet the Orders page still
 * tried to use it. This means order state was effectively ephemeral —
 * lost on every unmount — which is exactly the kind of bug that
 * React Query's caching prevents.
 *
 * With React Query the cache persists for `staleTime` regardless of
 * whether the component is mounted, so navigating away and back to
 * the Orders page shows data instantly while revalidating.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import orderService from '../services/order.service';

export const orderKeys = {
  all:    ['orders'],
  list:   (params) => ['orders', 'list', params],
  detail: (id)    => ['orders', 'detail', id],
};

export const useOrders = (params = {}) =>
  useQuery({
    queryKey: orderKeys.list(params),
    queryFn:  () => orderService.getAll(params),
    staleTime: 30_000,
    keepPreviousData: true,
  });

export const useOrder = (id) =>
  useQuery({
    queryKey: orderKeys.detail(id),
    queryFn:  () => orderService.getById(id),
    enabled:  !!id,
  });

export const useCreateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orderService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  });
};

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => orderService.updateStatus(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  });
};

export const useCancelOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => orderService.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.all }),
  });
};
