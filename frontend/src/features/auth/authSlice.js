import { createSlice } from '@reduxjs/toolkit';

const token = localStorage.getItem('ksk_token');
const user = JSON.parse(localStorage.getItem('ksk_user') || 'null');

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: user || null,
    token: token || null,
  },
  reducers: {
    setCredentials(state, action) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem('ksk_token', action.payload.token);
      localStorage.setItem('ksk_user', JSON.stringify(action.payload.user));
    },
    logout(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem('ksk_token');
      localStorage.removeItem('ksk_user');
    },
  },
});

export const { logout, setCredentials } = authSlice.actions;
export default authSlice.reducer;
