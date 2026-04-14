import api from './api';

const getAll = async (params = {}) => {
  const res = await api.get('/customers', { params });
  return res.data.data;
};

const getById = async (id) => {
  const res = await api.get(`/customers/${id}`);
  return res.data.data;
};

const getInvoices = async (id) => {
  const res = await api.get(`/customers/${id}/invoices`);
  return res.data.data;
};

const create = async (data) => {
  const res = await api.post('/customers', data);
  return res.data.data;
};

const update = async (id, data) => {
  const res = await api.put(`/customers/${id}`, data);
  return res.data.data;
};

const remove = async (id) => {
  const res = await api.delete(`/customers/${id}`);
  return res.data;
};

const customerService = { getAll, getById, getInvoices, create, update, delete: remove };
export default customerService;
