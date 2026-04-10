import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders, updateOrderStatus } from '../features/orders/orderSlice';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  pending:    'bg-yellow-100 text-yellow-700',
  confirmed:  'bg-blue-100 text-blue-700',
  dispatched: 'bg-purple-100 text-purple-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
};

const PAY_BADGE = {
  unpaid:  'bg-red-100 text-red-600',
  partial: 'bg-yellow-100 text-yellow-600',
  paid:    'bg-green-100 text-green-600',
};

const Orders = () => {
  const dispatch = useDispatch();
  const { items: orders, loading, pagination } = useSelector((s) => s.orders);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    dispatch(fetchOrders({ page, limit: 10, orderStatus: statusFilter }));
  }, [dispatch, page, statusFilter]);

  const markPaid = async (id) => {
    await dispatch(updateOrderStatus({ id, data: { paymentStatus: 'paid' } }));
    toast.success('Marked as paid');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">📦 Orders</h2>
        <Button>+ New Order</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'pending', 'confirmed', 'dispatched', 'delivered', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === s
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              {['Order #', 'Customer', 'Items', 'Amount', 'Type', 'Status', 'Payment', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">No orders found</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-green-700">{o.orderNumber}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.customer?.name}</div>
                    <div className="text-gray-400 text-xs">{o.customer?.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{o.items.length} item(s)</td>
                  <td className="px-4 py-3 font-semibold">₹{o.finalAmount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 capitalize">{o.orderType}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[o.orderStatus]}`}>
                      {o.orderStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PAY_BADGE[o.paymentStatus]}`}>
                      {o.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {o.paymentStatus !== 'paid' && o.orderStatus !== 'cancelled' && (
                      <Button variant="outline" className="py-1 px-2 text-xs" onClick={() => markPaid(o._id)}>
                        Mark Paid
                      </Button>
                    )}
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

export default Orders;
