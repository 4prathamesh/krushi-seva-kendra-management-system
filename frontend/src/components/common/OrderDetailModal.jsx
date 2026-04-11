import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from './Button';
import api from '../../services/api';

/**
 * FILE: src/components/common/OrderDetailModal.jsx
 *
 * Fetches and displays full order details including all line items.
 * Triggered by clicking the order number in the Orders table.
 *
 * Props:
 *   isOpen    {boolean}
 *   onClose   {() => void}
 *   orderId   {string | null}
 */

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

const Row = ({ label, children }) => (
  <div className="flex justify-between items-start py-1.5 border-b border-gray-50 last:border-0">
    <span className="text-gray-500 text-sm w-36 shrink-0">{label}</span>
    <span className="text-sm font-medium text-gray-800 text-right">{children}</span>
  </div>
);

const OrderDetailModal = ({ isOpen, onClose, orderId }) => {
  const [order, setOrder]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (!isOpen || !orderId) return;
    const fetch = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/orders/${orderId}`);
        setOrder(res.data.data.order);
      } catch {
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [isOpen, orderId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={order ? `Order — ${order.orderNumber}` : 'Order Details'}
      size="lg"
    >
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">Loading...</div>
      )}

      {error && (
        <div className="text-center py-10 text-red-500">{error}</div>
      )}

      {!loading && !error && order && (
        <div className="space-y-6">

          {/* Status badges */}
          <div className="flex gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[order.orderStatus]}`}>
              {order.orderStatus}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${PAY_BADGE[order.paymentStatus]}`}>
              {order.paymentStatus}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 capitalize">
              {order.orderType}
            </span>
          </div>

          {/* Customer & Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Customer</p>
              <div className="space-y-0.5">
                <Row label="Name">{order.customer?.name}</Row>
                <Row label="Phone">{order.customer?.phone}</Row>
                <Row label="Village">{order.customer?.village || '—'}</Row>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Order Info</p>
              <div className="space-y-0.5">
                <Row label="Order #">{order.orderNumber}</Row>
                <Row label="Payment">{order.paymentMethod?.replace('_', ' ')}</Row>
                <Row label="Created By">{order.createdBy?.name || '—'}</Row>
                <Row label="Date">
                  {new Date(order.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </Row>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Items</p>
            <div className="rounded-lg border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-2">Product</th>
                    <th className="text-right px-4 py-2">Qty</th>
                    <th className="text-right px-4 py-2">Rate</th>
                    <th className="text-right px-4 py-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {order.items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2.5 font-medium">{item.productName}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {item.quantity} {item.product?.unit || ''}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        ₹{item.pricePerUnit.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold">
                        ₹{item.subtotal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>₹{order.totalAmount.toLocaleString('en-IN')}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Discount</span>
                <span className="text-red-500">−₹{order.discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-green-700 border-t border-gray-200 pt-1.5 mt-1.5">
              <span>Total</span>
              <span>₹{order.finalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Notes</p>
              <p className="text-sm text-gray-700 bg-yellow-50 rounded-lg px-3 py-2">{order.notes}</p>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default OrderDetailModal;
