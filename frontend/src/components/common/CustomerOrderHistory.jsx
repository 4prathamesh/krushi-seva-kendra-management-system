import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from './Button';
import customerService from '../../services/customer.service';

/**
 * FILE: src/components/common/CustomerOrderHistory.jsx
 *
 * Fetches and displays all orders for a specific customer.
 * Triggered by clicking a customer's name/row in the Customers table.
 *
 * Props:
 *   isOpen    {boolean}
 *   onClose   {() => void}
 *   customer  {object | null}   — customer object (needs _id and name)
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

const CustomerOrderHistory = ({ isOpen, onClose, customer }) => {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!isOpen || !customer?._id) return;
    const fetch = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await customerService.getOrders(customer._id);
        setOrders(data.orders || []);
      } catch {
        setError('Failed to load order history');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [isOpen, customer]);

  const totalSpent = orders
    .filter((o) => o.orderStatus !== 'cancelled')
    .reduce((sum, o) => sum + (o.finalAmount || 0), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`📋 Order History — ${customer?.name || ''}`}
      size="lg"
    >
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">Loading...</div>
      )}
      {error && (
        <div className="text-center py-10 text-red-500">{error}</div>
      )}

      {!loading && !error && (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Total Orders', value: orders.length, color: 'text-blue-700 bg-blue-50' },
              { label: 'Total Spent', value: `₹${totalSpent.toLocaleString('en-IN')}`, color: 'text-green-700 bg-green-50' },
              { label: 'Pending', value: orders.filter((o) => o.orderStatus === 'pending').length, color: 'text-yellow-700 bg-yellow-50' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`rounded-lg p-3 text-center ${color}`}>
                <p className="text-lg font-bold">{value}</p>
                <p className="text-xs font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-10 text-gray-400">No orders found for this customer</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {orders.map((o) => (
                <div key={o._id} className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-mono font-semibold text-green-700 text-sm">{o.orderNumber}</span>
                      <span className="text-gray-400 text-xs ml-2">
                        {new Date(o.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[o.orderStatus]}`}>
                        {o.orderStatus}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PAY_BADGE[o.paymentStatus]}`}>
                        {o.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-1 mb-2">
                    {o.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-600">
                        <span>{item.productName} × {item.quantity} {item.product?.unit || ''}</span>
                        <span>₹{item.subtotal.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                    <span className="text-xs text-gray-500 capitalize">{o.paymentMethod?.replace('_', ' ')} · {o.orderType}</span>
                    <span className="font-bold text-sm text-gray-800">₹{o.finalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-100 mt-4">
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </>
      )}
    </Modal>
  );
};

export default CustomerOrderHistory;
