import api from './api';

const getAll = async (params = {}) => {
  const res = await api.get('/purchases', { params });
  return res.data.data;
};

const getById = async (id) => {
  const res = await api.get(`/purchases/${id}`);
  return res.data.data;
};

const create = async (data) => {
  const res = await api.post('/purchases', data);
  return res.data.data;
};

const purchaseService = { getAll, getById, create };
export default purchaseService;
