import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateOrderStatus } from '../../features/orders/orderSlice';
import Modal from '../ui/Modal';
import Select from './Select';
import Textarea from './Textarea';
import Button from './Button';
import toast from 'react-hot-toast';

const ORDER_STATUSES  = ['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid'];

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

const validate = (form) => {
  const errs = {};
  if (!form.orderStatus)   errs.orderStatus   = 'Order status is required';
  if (!form.paymentStatus) errs.paymentStatus = 'Payment status is required';
  return errs;
};

/**
 * FILE: src/components/common/OrderStatusForm.jsx
 *
 * A focused modal to update an existing order's status + payment.
 * Used from the Edit button on non-terminal orders in Orders.jsx.
 *
 * Props:
 *   isOpen  {boolean}
 *   onClose {() => void}
 *   order   {object}   — the order being edited (required)
 */
const OrderStatusForm = ({ isOpen, onClose, order }) => {
  const dispatch = useDispatch();

  const [form, setForm]         = useState({ orderStatus: '', paymentStatus: '', notes: '' });
  const [errors, setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && order) {
      setForm({
        orderStatus:   order.orderStatus   || 'pending',
        paymentStatus: order.paymentStatus || 'unpaid',
        notes:         order.notes         || '',
      });
      setErrors({});
    }
  }, [isOpen, order]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      await dispatch(
        updateOrderStatus({ id: order._id, data: form })
      ).unwrap();
      toast.success(`Order ${order.orderNumber} updated`);
      onClose();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to update order');
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`✏️ Update Order — ${order.orderNumber}`}
      size="sm"
    >
      {/* Order summary card */}
      <div className="bg-gray-50 rounded-lg p-4 mb-5 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-500">Customer</span>
          <span className="font-medium">{order.customer?.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Amount</span>
          <span className="font-semibold text-green-700">
            ₹{order.finalAmount?.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Current Status</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[order.orderStatus]}`}>
            {order.orderStatus}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Current Payment</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PAY_BADGE[order.paymentStatus]}`}>
            {order.paymentStatus}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Select
          label="Order Status *"
          name="orderStatus"
          value={form.orderStatus}
          onChange={handleChange}
          error={errors.orderStatus}
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>

        <Select
          label="Payment Status *"
          name="paymentStatus"
          value={form.paymentStatus}
          onChange={handleChange}
          error={errors.paymentStatus}
        >
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>

        <Textarea
          label="Notes"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Add a note about this update..."
          rows={2}
        />

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default OrderStatusForm;
