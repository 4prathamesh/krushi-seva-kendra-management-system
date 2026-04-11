import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders, updateOrderStatus, cancelOrder } from '../features/orders/orderSlice';
import Button from '../components/common/Button';
import OrderForm from '../components/common/OrderForm';
import OrderStatusForm from '../components/common/OrderStatusForm';
import OrderDetailModal from '../components/common/OrderDetailModal';
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

const FilterPills = ({ value, onChange, options }) => (
  <div className="flex gap-1 flex-wrap">
    {options.map(([val, label]) => (
      <button
        key={val}
        onClick={() => onChange(val)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          value === val
            ? 'bg-green-600 text-white border-green-600'
            : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);

const Orders = () => {
  const dispatch = useDispatch();
  const { items: orders, loading, pagination } = useSelector((s) => s.orders);

  const [page, setPage]                   = useState(1);
  const [statusFilter, setStatusFilter]   = useState('');
  const [payFilter, setPayFilter]         = useState('');
  const [typeFilter, setTypeFilter]       = useState('');

  // ── Modal state ──
  const [formOpen, setFormOpen]     = useState(false);
  const [editingOrder, setEditing]  = useState(null);
  const [detailId, setDetailId]     = useState(null);

  useEffect(() => {
    dispatch(fetchOrders({
      page,
      limit: 10,
      orderStatus:   statusFilter  || undefined,
      paymentStatus: payFilter     || undefined,
      orderType:     typeFilter    || undefined,
    }));
  }, [dispatch, page, statusFilter, payFilter, typeFilter]);

  const openAdd   = () => { setEditing(null); setFormOpen(true); };
  const openEdit  = (o) => { setEditing(o);   setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const markPaid = async (id) => {
    try {
      await dispatch(updateOrderStatus({ id, data: { paymentStatus: 'paid' } })).unwrap();
      toast.success('Marked as paid');
    } catch (err) {
      toast.error(err || 'Failed to update order');
    }
  };

  const handleCancel = async (id, orderNumber) => {
    if (!window.confirm(`Cancel order ${orderNumber}? Stock will be restored.`)) return;
    try {
      await dispatch(cancelOrder(id)).unwrap();
      toast.success(`Order ${orderNumber} cancelled — stock restored`);
    } catch (err) {
      toast.error(err || 'Failed to cancel order');
    }
  };

  const resetFilters = () => {
    setStatusFilter(''); setPayFilter(''); setTypeFilter(''); setPage(1);
  };
  const hasFilter = statusFilter || payFilter || typeFilter;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">📦 Orders</h2>
        <Button onClick={openAdd}>+ New Order</Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Filters</p>
          {hasFilter && (
            <button onClick={resetFilters} className="text-xs text-red-400 hover:text-red-600 font-medium">
              ✕ Clear all
            </button>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium">Order Status</p>
          <FilterPills
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            options={[
              ['', 'All'],
              ['pending', 'Pending'],
              ['confirmed', 'Confirmed'],
              ['dispatched', 'Dispatched'],
              ['delivered', 'Delivered'],
              ['cancelled', 'Cancelled'],
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">Payment</p>
            <FilterPills
              value={payFilter}
              onChange={(v) => { setPayFilter(v); setPage(1); }}
              options={[['', 'All'], ['unpaid', 'Unpaid'], ['partial', 'Partial'], ['paid', 'Paid']]}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">Order Type</p>
            <FilterPills
              value={typeFilter}
              onChange={(v) => { setTypeFilter(v); setPage(1); }}
              options={[['', 'All'], ['offline', 'Offline'], ['online', 'Online']]}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              {['Order #', 'Customer', 'Items', 'Amount', 'Type', 'Status', 'Payment', 'Created By', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-10 text-gray-400">No orders found</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDetailId(o._id)}
                      className="font-mono font-semibold text-green-700 hover:text-green-900 hover:underline transition-colors"
                    >
                      {o.orderNumber}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.customer?.name}</div>
                    <div className="text-gray-400 text-xs">{o.customer?.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{o.items.length} item(s)</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">₹{o.finalAmount.toLocaleString('en-IN')}</div>
                    {o.discountAmount > 0 && (
                      <div className="text-xs text-gray-400">−₹{o.discountAmount.toLocaleString('en-IN')} disc.</div>
                    )}
                  </td>
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
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {o.createdBy?.name || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {o.orderStatus !== 'cancelled' && o.orderStatus !== 'delivered' && (
                        <Button variant="outline" className="py-1 px-2 text-xs" onClick={() => openEdit(o)}>
                          Edit
                        </Button>
                      )}
                      {o.paymentStatus !== 'paid' && o.orderStatus !== 'cancelled' && (
                        <Button variant="outline" className="py-1 px-2 text-xs" onClick={() => markPaid(o._id)}>
                          Paid ✓
                        </Button>
                      )}
                      {o.orderStatus !== 'cancelled' && o.orderStatus !== 'delivered' && (
                        <Button variant="danger" className="py-1 px-2 text-xs" onClick={() => handleCancel(o._id, o.orderNumber)}>
                          Cancel
                        </Button>
                      )}
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

      {/* Add Order Modal */}
      <OrderForm isOpen={formOpen && !editingOrder} onClose={closeForm} />

      {/* Edit Order Status Modal */}
      <OrderStatusForm isOpen={formOpen && Boolean(editingOrder)} onClose={closeForm} order={editingOrder} />

      {/* Order Detail Modal */}
      <OrderDetailModal isOpen={Boolean(detailId)} onClose={() => setDetailId(null)} orderId={detailId} />
    </div>
  );
};

export default Orders;
