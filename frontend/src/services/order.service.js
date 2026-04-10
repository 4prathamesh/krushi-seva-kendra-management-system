import api from './api';

const getAll = async (params = {}) => {
  const res = await api.get('/orders', { params });
  return res.data.data;
};

const getById = async (id) => {
  const res = await api.get(`/orders/${id}`);
  return res.data.data;
};

const getDashboard = async () => {
  const res = await api.get('/orders/dashboard');
  return res.data.data;
};

const create = async (data) => {
  const res = await api.post('/orders', data);
  return res.data.data;
};

const updateStatus = async (id, data) => {
  const res = await api.patch(`/orders/${id}/status`, data);
  return res.data.data;
};

const cancel = async (id) => {
  const res = await api.delete(`/orders/${id}`);
  return res.data;
};

const orderService = { getAll, getById, getDashboard, create, updateStatus, cancel };
export default orderService;
