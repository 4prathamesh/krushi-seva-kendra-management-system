import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCustomers, deleteCustomer } from '../features/customers/customerSlice';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import CustomerForm from '../components/common/CustomerForm';
import CustomerOrderHistory from '../components/common/CustomerOrderHistory';
import api from '../services/api';
import toast from 'react-hot-toast';

// ─── Filter pill component ─────────────────────────────────────────────────
const FilterPill = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
      active
        ? 'bg-green-600 text-white border-green-600'
        : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
    }`}
  >
    {label}
  </button>
);

const Customers = () => {
  const dispatch = useDispatch();
  const { items: customers, loading, pagination } = useSelector((s) => s.customers);

  // ── Filters ──
  const [search, setSearch]         = useState('');
  const [villageFilter, setVillage] = useState('');
  const [udharFilter, setUdhar]     = useState(false);  // true = only customers with Udhar
  const [page, setPage]             = useState(1);

  // ── Village dropdown data ──
  const [villages, setVillages]     = useState([]);

  // ── Modals ──
  const [formOpen, setFormOpen]         = useState(false);
  const [editingCustomer, setEditing]   = useState(null);
  const [historyCustomer, setHistoryCust] = useState(null);

  // Load distinct villages for the filter dropdown once on mount
  useEffect(() => {
    api.get('/customers/villages')
      .then((r) => setVillages(r.data.data.villages || []))
      .catch(() => {});
  }, []);

  // Fetch customers whenever filters change
  useEffect(() => {
    const controller = new AbortController();
    dispatch(fetchCustomers({
      search:   search   || undefined,
      village:  villageFilter || undefined,
      hasUdhar: udharFilter  || undefined,
      page,
      limit: 10,
    }));
    return () => controller.abort();
  }, [dispatch, search, villageFilter, udharFilter, page]);

  const openAdd      = () => { setEditing(null); setFormOpen(true); };
  const openEdit     = (c) => { setEditing(c);   setFormOpen(true); };
  const closeForm    = () => { setFormOpen(false); setEditing(null); };
  const openHistory  = (c) => setHistoryCust(c);
  const closeHistory = () => setHistoryCust(null);

  const handleSaved = () => dispatch(fetchCustomers({
    search: search || undefined, village: villageFilter || undefined,
    hasUdhar: udharFilter || undefined, page, limit: 10,
  }));

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await dispatch(deleteCustomer(id)).unwrap();
      toast.success('Customer deleted');
    } catch (err) {
      toast.error(err || 'Failed to delete customer');
    }
  };

  const resetFilters = () => {
    setSearch(''); setVillage(''); setUdhar(false); setPage(1);
  };

  const hasFilter = search || villageFilter || udharFilter;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">👨‍🌾 Customers</h2>
        <Button onClick={openAdd}>+ Add Customer</Button>
      </div>

      {/* Filter panel */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        {/* Row 1: search + village dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              placeholder="Search by name or mobile..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            value={villageFilter}
            onChange={(e) => { setVillage(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Villages</option>
            {villages.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {/* Row 2: quick filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">Quick filter:</span>
          <FilterPill
            label="All Customers"
            active={!udharFilter}
            onClick={() => { setUdhar(false); setPage(1); }}
          />
          <FilterPill
            label="📒 Has Udhar (Credit Due)"
            active={udharFilter}
            onClick={() => { setUdhar(true); setPage(1); }}
          />
          {hasFilter && (
            <button
              onClick={resetFilters}
              className="ml-auto text-xs text-red-400 hover:text-red-600 font-medium"
            >
              ✕ Clear all
            </button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      {udharFilter && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-red-700">
          <span>📒</span>
          <span>
            Showing <strong>{pagination.total ?? 0}</strong> customers with outstanding credit
          </span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              {['Name', 'Phone', 'Village', 'District', 'Total Billed', 'Udhar / Credit', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400">
                  {udharFilter ? 'No customers with outstanding credit' : 'No customers found'}
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openHistory(c)}
                      className="font-medium text-gray-800 hover:text-green-700 hover:underline transition-colors text-left"
                    >
                      {c.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                  <td className="px-4 py-3">{c.village || '—'}</td>
                  <td className="px-4 py-3">{c.district || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">
                    ₹{(c.totalPurchases ?? 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    {(c.creditBalance || 0) > 0 ? (
                      <button
                        onClick={() => openHistory(c)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 transition-colors"
                        title="Click to view & record payment"
                      >
                        📒 ₹{Number(c.creditBalance).toFixed(2)}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">✓ Clear</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Button variant="outline" className="py-1 px-2 text-xs" onClick={() => openHistory(c)}>
                        Invoices
                      </Button>
                      <Button variant="outline" className="py-1 px-2 text-xs" onClick={() => openEdit(c)}>
                        Edit
                      </Button>
                      <Button variant="danger" className="py-1 px-2 text-xs" onClick={() => handleDelete(c._id, c.name)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {pagination.pages > 1 && (
          <div className="flex justify-end items-center gap-2 px-4 py-3 border-t text-sm">
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="py-1 px-3">←</Button>
            <span className="text-gray-600">Page {page} of {pagination.pages}</span>
            <Button variant="secondary" disabled={page === pagination.pages} onClick={() => setPage((p) => p + 1)} className="py-1 px-3">→</Button>
          </div>
        )}
      </div>

      <CustomerForm isOpen={formOpen} onClose={closeForm} customer={editingCustomer} onSaved={handleSaved} />
      <CustomerOrderHistory isOpen={Boolean(historyCustomer)} onClose={closeHistory} customer={historyCustomer} onPaymentRecorded={handleSaved} />
    </div>
  );
};

export default Customers;
