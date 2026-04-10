import { useEffect, useState } from 'react';
import api from '../services/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers', { params: { search, page, limit: 10 } });
      setCustomers(res.data.data.customers);
      setPagination(res.data.data.pagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, page]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">👨‍🌾 Customers</h2>
        <Button>+ Add Customer</Button>
      </div>

      <Input
        placeholder="Search by name or phone..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="w-64"
      />

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              {['Name', 'Phone', 'Village', 'District', 'Crops', 'Total Purchases', 'Balance'].map((h) => (
                <th key={h} className="text-left px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">No customers found</td></tr>
            ) : (
              customers.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                  <td className="px-4 py-3">{c.village || '—'}</td>
                  <td className="px-4 py-3">{c.district || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.cropTypes?.join(', ') || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">
                    ₹{c.totalPurchases?.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={c.outstandingBalance > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>
                      ₹{c.outstandingBalance?.toLocaleString('en-IN')}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {pagination.pages > 1 && (
          <div className="flex justify-end items-center gap-2 px-4 py-3 border-t text-sm">
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="py-1 px-3">←</Button>
            <span className="text-gray-600">Page {page} of {pagination.pages}</span>
            <Button variant="secondary" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)} className="py-1 px-3">→</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Customers;
