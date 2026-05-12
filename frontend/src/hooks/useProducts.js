/**
 * useProducts.js — React Query hooks for the Products domain
 *
 * WHY: The old productSlice used createAsyncThunk for every CRUD
 * operation and manually updated the local Redux array on success
 * (unshift, splice, filter). This is fragile — if the server
 * returns slightly different data the UI goes out of sync.
 *
 * React Query solves this by treating the server as the source
 * of truth. After a mutation we call invalidateQueries so the
 * list re-fetches automatically and always matches the DB.
 *
 * BENEFITS gained:
 *  ✓ Automatic background refetch when the window regains focus
 *  ✓ Built-in loading / error states — no more `loading: false`
 *    boilerplate in reducers
 *  ✓ Query deduplication — mounting Products page twice fires
 *    only one network request
 *  ✓ Stale-while-revalidate — users see cached data instantly
 *    while a fresh fetch runs in background
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import productService from '../services/product.service';

// ── Query key factory ────────────────────────────────────────────────────────
// Putting params inside the key means different filter combinations
// get their own cache entry. Changing search/category/page
// automatically triggers a new fetch without any useEffect.
export const productKeys = {
  all:      ['products'],
  list:     (params) => ['products', 'list', params],
  detail:   (id)    => ['products', 'detail', id],
  lowStock: ()      => ['products', 'lowStock'],
};

// ── List with filters / pagination ───────────────────────────────────────────
export const useProducts = (params = {}) =>
  useQuery({
    queryKey: productKeys.list(params),
    queryFn:  () => productService.getAll(params),
    staleTime: 30_000, // 30s — product list is reasonably stable
    keepPreviousData: true, // keeps old page visible while next page loads
  });

// ── Single product ───────────────────────────────────────────────────────────
export const useProduct = (id) =>
  useQuery({
    queryKey: productKeys.detail(id),
    queryFn:  () => productService.getById(id),
    enabled:  !!id,
  });

// ── Low-stock products ───────────────────────────────────────────────────────
export const useLowStockProducts = () =>
  useQuery({
    queryKey: productKeys.lowStock(),
    queryFn:  productService.getLowStock,
    staleTime: 60_000,
  });

// ── Create ───────────────────────────────────────────────────────────────────
export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: productService.create,
    onSuccess: () => {
      // Invalidate ALL product lists so every active list re-fetches.
      // This is safer than manually prepending to local state.
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
};

// ── Update ───────────────────────────────────────────────────────────────────
export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => productService.update(id, data),
    onSuccess: (updatedProduct) => {
      // Update the detail cache immediately (optimistic-style)
      qc.setQueryData(productKeys.detail(updatedProduct.product._id), updatedProduct);
      // Then invalidate lists to pull fresh data
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
};

// ── Update stock only ────────────────────────────────────────────────────────
export const useUpdateStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stock }) => productService.updateStock(id, stock),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
};

// ── Delete ───────────────────────────────────────────────────────────────────
export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => productService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
};
