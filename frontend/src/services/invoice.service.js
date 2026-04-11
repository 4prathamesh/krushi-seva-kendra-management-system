import api from './api';

const getAll = async (params = {}) => {
  const res = await api.get('/invoices', { params });
  return res.data.data;
};

const getById = async (id) => {
  const res = await api.get(`/invoices/${id}`);
  return res.data.data;
};

const create = async (data) => {
  const res = await api.post('/invoices', data);
  return res.data.data;
};

const cancel = async (id, reason = '') => {
  const res = await api.delete(`/invoices/${id}`, { data: { reason } });
  return res.data;
};

const getGSTReport = async (params = {}) => {
  const res = await api.get('/invoices/gst-report', { params });
  return res.data.data;
};

const invoiceService = { getAll, getById, create, cancel, getGSTReport };
export default invoiceService;
