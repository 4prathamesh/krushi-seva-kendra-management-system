/**
 * usePurchases.js — React Query hooks for the Purchases domain
 *
 * WHY: Purchases had no Redux slice at all — the Purchases page
 * called purchaseService directly inside a useEffect with manual
 * loading/error state. React Query replaces those manual state
 * variables with a single useQuery call.
 *
 * Creating a purchase should also invalidate the product list
 * because purchases update stock quantities — that cross-domain
 * invalidation is easy to express here and was impossible before.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import purchaseService from '../services/purchase.service';
import { productKeys } from './useProducts';

export const purchaseKeys = {
  all:    ['purchases'],
  list:   (params) => ['purchases', 'list', params],
  detail: (id)    => ['purchases', 'detail', id],
};

export const usePurchases = (params = {}) =>
  useQuery({
    queryKey: purchaseKeys.list(params),
    queryFn:  () => purchaseService.getAll(params),
    staleTime: 30_000,
    keepPreviousData: true,
  });

export const usePurchase = (id) =>
  useQuery({
    queryKey: purchaseKeys.detail(id),
    queryFn:  () => purchaseService.getById(id),
    enabled:  !!id,
  });

export const useCreatePurchase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: purchaseService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: purchaseKeys.all });
      // A purchase changes stock levels — invalidate products too
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
};
