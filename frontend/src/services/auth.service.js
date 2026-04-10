import api from './api';

const login = async (credentials) => {
  const res = await api.post('/auth/login', credentials);
  return res.data.data;
};

const getMe = async () => {
  const res = await api.get('/auth/me');
  return res.data.data;
};

const changePassword = async (data) => {
  const res = await api.put('/auth/change-password', data);
  return res.data;
};

const authService = { login, getMe, changePassword };
export default authService;
