/**
 * useAuth.js — React Query hooks for authentication
 *
 * WHY: Login is a server mutation (it creates a session on the
 * backend and returns a token). Keeping it in Redux Thunk mixed
 * the concerns of "talking to the server" with "storing the
 * result". React Query mutation gives us isLoading, isError,
 * and onSuccess/onError callbacks for free, without any
 * extraReducers boilerplate.
 *
 * The onSuccess callback still dispatches setCredentials to
 * Redux, because the token/user identity IS global client state
 * that belongs in Redux.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import authService from '../services/auth.service';
import { setCredentials, logout as logoutAction } from '../features/auth/authSlice';

// ── Query keys (centralised so invalidation is consistent) ─────────────────
export const authKeys = {
  me: ['auth', 'me'],
};

// ── Get current user profile ────────────────────────────────────────────────
export const useGetMe = () =>
  useQuery({
    queryKey: authKeys.me,
    queryFn:  authService.getMe,
    staleTime: 5 * 60 * 1000, // 5 min — profile data rarely changes
  });

// ── Login mutation ──────────────────────────────────────────────────────────
export const useLogin = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      // 1. Persist token + user in Redux (global client state)
      dispatch(setCredentials(data));
      // 2. Seed the 'me' cache so the first profile load is instant
      queryClient.setQueryData(authKeys.me, data);
    },
  });
};

// ── Logout helper ────────────────────────────────────────────────────────────
export const useLogout = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return () => {
    dispatch(logoutAction());
    // Clear ALL cached server state on logout — prevents stale data
    // from being shown if another user logs in on the same browser.
    queryClient.clear();
  };
};
