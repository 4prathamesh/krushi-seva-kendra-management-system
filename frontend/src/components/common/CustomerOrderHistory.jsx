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

const PAY_BADGE = {
  cash: 'bg-green-100 text-green-700',
  upi:  'bg-blue-100 text-blue-700',
  card: 'bg-purple-100 text-purple-700',
};

const STATUS_BADGE = {
  paid:      'bg-green-100 text-green-700',
  draft:     'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
};

const CustomerOrderHistory = ({ isOpen, onClose, customer }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!isOpen || !customer?._id) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        // Calls GET /customers/:id/invoices (refactored from /orders)
        const data = await customerService.getInvoices(customer._id);
        setInvoices(data.invoices || []);
      } catch {
        setError('Failed to load invoice history');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen, customer]);

  const totalSpent = invoices
    .filter((inv) => !inv.isCancelled)
    .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`📋 Invoice History — ${customer?.name || ''}`}
      size="lg"
    >
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          Loading...
        </div>
      )}
      {error && (
        <div className="text-center py-10 text-red-500">{error}</div>
      )}

      {!loading && !error && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              {
                label: 'Total Invoices',
                value: invoices.length,
                color: 'text-blue-700 bg-blue-50',
              },
              {
                label: 'Total Spent',
                value: `₹${totalSpent.toLocaleString('en-IN')}`,
                color: 'text-green-700 bg-green-50',
              },
              {
                label: 'Cancelled',
                value: invoices.filter((inv) => inv.isCancelled).length,
                color: 'text-red-700 bg-red-50',
              },
            ].map(({ label, value, color }) => (
              <div key={label} className={`rounded-lg p-3 text-center ${color}`}>
                <p className="text-lg font-bold">{value}</p>
                <p className="text-xs font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {invoices.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              No invoices found for this customer
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {invoices.map((inv) => (
                <div
                  key={inv._id}
                  className={`border rounded-lg p-4 ${
                    inv.isCancelled
                      ? 'border-red-100 bg-red-50/30 opacity-70'
                      : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-mono font-semibold text-green-700 text-sm">
                        {inv.invoiceNumber}
                      </span>
                      <span className="text-gray-400 text-xs ml-2">
                        {new Date(inv.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {/* Invoice status badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          STATUS_BADGE[inv.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {inv.status}
                      </span>
                      {/* Payment mode badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                          PAY_BADGE[inv.paymentMode] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {inv.paymentMode}
                      </span>
                    </div>
                  </div>

                  {/* Line items */}
                  <div className="space-y-0.5 mb-2">
                    {inv.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-xs text-gray-600"
                      >
                        <span>
                          {item.productName} × {item.quantity}
                        </span>
                        <span>₹{Number(item.total).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* GST + Grand Total footer */}
                  <div className="border-t border-gray-100 pt-2 mt-1 grid grid-cols-2 gap-x-2 text-xs text-gray-500">
                    <span>CGST: ₹{Number(inv.cgstTotal).toFixed(2)}</span>
                    <span className="text-right">
                      SGST: ₹{Number(inv.sgstTotal).toFixed(2)}
                    </span>
                    <span className="col-span-2 flex justify-between mt-1 text-sm font-bold text-gray-800">
                      <span>Grand Total</span>
                      <span>₹{Number(inv.grandTotal).toLocaleString('en-IN')}</span>
                    </span>
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
