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

const getDashboardStats = async () => {
  const res = await api.get('/invoices/dashboard-stats');
  return res.data.data;
};

const lookupByMobile = async (mobile) => {
  const res = await api.get('/invoices/lookup', { params: { mobile } });
  return res.data.data;
};

const recordCreditPayment = async (data) => {
  const res = await api.post('/invoices/credit-payment', data);
  return res.data.data;
};

const getCreditLedger = async (customerId) => {
  const res = await api.get(`/invoices/credit-ledger/${customerId}`);
  return res.data.data;
};

const invoiceService = { getAll, getById, create, cancel, getGSTReport, getDashboardStats, lookupByMobile, recordCreditPayment, getCreditLedger };
export default invoiceService;
