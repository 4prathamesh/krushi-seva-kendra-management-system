import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCustomers, deleteCustomer } from '../features/customers/customerSlice';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import CustomerForm from '../components/common/CustomerForm';
import CustomerOrderHistory from '../components/common/CustomerOrderHistory';
import toast from 'react-hot-toast';

const Customers = () => {
  const dispatch = useDispatch();
  const { items: customers, loading, pagination } = useSelector((s) => s.customers);

  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);

  // ── Add / Edit modal ──
  const [formOpen, setFormOpen]         = useState(false);
  const [editingCustomer, setEditing]   = useState(null);

  // ── Order history modal ──
  const [historyCustomer, setHistoryCust] = useState(null);

  useEffect(() => {
    dispatch(fetchCustomers({ search, page, limit: 10 }));
  }, [dispatch, search, page]);

  const openAdd       = () => { setEditing(null); setFormOpen(true); };
  const openEdit      = (c) => { setEditing(c);   setFormOpen(true); };
  const closeForm     = () => { setFormOpen(false); setEditing(null); };
  const openHistory   = (c) => setHistoryCust(c);
  const closeHistory  = ()  => setHistoryCust(null);

  const handleSaved = () => dispatch(fetchCustomers({ search, page, limit: 10 }));

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await dispatch(deleteCustomer(id)).unwrap();
      toast.success('Customer deleted');
    } catch (err) {
      toast.error(err || 'Failed to delete customer');
    }
  };

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">👨‍🌾 Customers</h2>
        <Button onClick={openAdd}>+ Add Customer</Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search by name or phone..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="w-64"
      />

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              {['Name', 'Phone', 'Village', 'District', 'Crops', 'Purchases', 'Balance', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">No customers found</td></tr>
            ) : (
              customers.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50">
                  {/* Clickable name → opens order history */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openHistory(c)}
                      className="font-medium text-gray-800 hover:text-green-700 hover:underline transition-colors text-left"
                      title="Click to view order history"
                    >
                      {c.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                  <td className="px-4 py-3">{c.village || '—'}</td>
                  <td className="px-4 py-3">{c.district || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate">
                    {c.cropTypes?.length > 0 ? c.cropTypes.join(', ') : '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-green-700">
                    ₹{(c.totalPurchases ?? 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={c.outstandingBalance > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>
                      ₹{(c.outstandingBalance ?? 0).toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Button variant="outline" className="py-1 px-2 text-xs" onClick={() => openHistory(c)}>
                        Orders
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

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-end items-center gap-2 px-4 py-3 border-t text-sm">
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="py-1 px-3">←</Button>
            <span className="text-gray-600">Page {page} of {pagination.pages}</span>
            <Button variant="secondary" disabled={page === pagination.pages} onClick={() => setPage((p) => p + 1)} className="py-1 px-3">→</Button>
          </div>
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      <CustomerForm
        isOpen={formOpen}
        onClose={closeForm}
        customer={editingCustomer}
        onSaved={handleSaved}
      />

      {/* Customer Order History Modal */}
      <CustomerOrderHistory
        isOpen={Boolean(historyCustomer)}
        onClose={closeHistory}
        customer={historyCustomer}
      />
    </div>
  );
};

export default Customers;
