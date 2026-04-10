import api from './api';

const getAll = async (params = {}) => {
  const res = await api.get('/products', { params });
  return res.data.data;
};

const getById = async (id) => {
  const res = await api.get(`/products/${id}`);
  return res.data.data;
};

const getLowStock = async () => {
  const res = await api.get('/products/low-stock');
  return res.data.data;
};

const create = async (formData) => {
  const res = await api.post('/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
};

const update = async (id, data) => {
  const res = await api.put(`/products/${id}`, data);
  return res.data.data;
};

const updateStock = async (id, stock) => {
  const res = await api.patch(`/products/${id}/stock`, { stock });
  return res.data.data;
};

const remove = async (id) => {
  const res = await api.delete(`/products/${id}`);
  return res.data;
};

const productService = { getAll, getById, getLowStock, create, update, updateStock, delete: remove };
export default productService;
