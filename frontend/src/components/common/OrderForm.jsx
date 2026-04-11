import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { createOrder } from '../../features/orders/orderSlice';
import Modal from '../ui/Modal';
import Input from './Input';
import Select from './Select';
import Textarea from './Textarea';
import Button from './Button';
import api from '../../services/api';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const EMPTY_ITEM = { product: '', quantity: '1' };

const EMPTY_FORM = {
  customer: '',
  orderType: 'offline',
  paymentMethod: 'cash',
  discountAmount: '0',
  notes: '',
};

// ─── Validation ───────────────────────────────────────────────────────────────
const validate = (form, items) => {
  const errs = {};
  if (!form.customer) errs.customer = 'Customer is required';

  const itemErrs = items.map((item) => {
    const e = {};
    if (!item.product) e.product = 'Select a product';
    if (!item.quantity || Number(item.quantity) < 1) e.quantity = 'Min 1';
    return e;
  });
  const hasItemErr = itemErrs.some((e) => Object.keys(e).length > 0);
  if (hasItemErr) errs.items = itemErrs;
  if (items.length === 0) errs.itemsEmpty = 'Add at least one item';

  if (form.discountAmount && (isNaN(form.discountAmount) || Number(form.discountAmount) < 0))
    errs.discountAmount = 'Must be ≥ 0';

  return errs;
};

// ─── Sub-component: OrderItemRow ──────────────────────────────────────────────
const OrderItemRow = ({ item, index, products, onChange, onRemove, errors = {} }) => {
  const selectedProduct = products.find((p) => p._id === item.product);
  const subtotal = selectedProduct
    ? (selectedProduct.pricePerUnit * Number(item.quantity || 0)).toLocaleString('en-IN')
    : '—';

  return (
    <div className="grid grid-cols-12 gap-2 items-start">
      {/* Product selector — 6 cols */}
      <div className="col-span-6">
        <Select
          value={item.product}
          onChange={(e) => onChange(index, 'product', e.target.value)}
          error={errors.product}
        >
          <option value="">Select product</option>
          {products.map((p) => (
            <option key={p._id} value={p._id} disabled={p.stock === 0}>
              {p.name} ({p.unit}) — ₹{p.pricePerUnit} | Stock: {p.stock}
            </option>
          ))}
        </Select>
      </div>

      {/* Quantity — 2 cols */}
      <div className="col-span-2">
        <Input
          type="number"
          min="1"
          max={selectedProduct?.stock || 9999}
          value={item.quantity}
          onChange={(e) => onChange(index, 'quantity', e.target.value)}
          placeholder="Qty"
          error={errors.quantity}
        />
      </div>

      {/* Subtotal — 3 cols */}
      <div className="col-span-3 flex items-center h-9 px-1">
        <span className="text-sm font-semibold text-gray-700">₹{subtotal}</span>
      </div>

      {/* Remove — 1 col */}
      <div className="col-span-1 flex items-center justify-center h-9">
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-red-400 hover:text-red-600 text-lg leading-none transition-colors"
          title="Remove item"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
/**
 * FILE: src/components/common/OrderForm.jsx
 *
 * Props:
 *   isOpen   {boolean}
 *   onClose  {() => void}
 *   order    {object | null}  — null = Add, object = Edit (status/payment only)
 */
const OrderForm = ({ isOpen, onClose, order = null }) => {
  const dispatch = useDispatch();
  const isEdit = Boolean(order);

  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Remote data
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Fetch customers & products when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [custRes, prodRes] = await Promise.all([
          api.get('/customers', { params: { limit: 200 } }),
          api.get('/products', { params: { limit: 200, stockStatus: 'in_stock' } }),
        ]);
        setCustomers(custRes.data.data.customers);
        setProducts(prodRes.data.data.products);
      } catch {
        toast.error('Failed to load customers/products');
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [isOpen]);

  // Populate for edit (only status/payment fields editable)
  useEffect(() => {
    if (isOpen) {
      if (order) {
        setForm({
          customer: order.customer?._id || order.customer || '',
          orderType: order.orderType || 'offline',
          paymentMethod: order.paymentMethod || 'cash',
          discountAmount: String(order.discountAmount ?? '0'),
          notes: order.notes || '',
        });
        setItems(
          order.items.map((i) => ({
            product: i.product?._id || i.product || '',
            quantity: String(i.quantity),
          }))
        );
      } else {
        setForm(EMPTY_FORM);
        setItems([{ ...EMPTY_ITEM }]);
      }
      setErrors({});
    }
  }, [isOpen, order]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleItemChange = useCallback((index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    // Clear item-level errors
    setErrors((prev) => {
      if (!prev.items) return prev;
      const itemErrs = [...(prev.items || [])];
      if (itemErrs[index]) delete itemErrs[index][field];
      return { ...prev, items: itemErrs };
    });
  }, []);

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);

  const removeItem = (index) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  // ── Totals ──
  const subtotals = items.map((item) => {
    const prod = products.find((p) => p._id === item.product);
    return prod ? prod.pricePerUnit * Number(item.quantity || 0) : 0;
  });
  const totalAmount = subtotals.reduce((a, b) => a + b, 0);
  const discount = Number(form.discountAmount || 0);
  const finalAmount = Math.max(totalAmount - discount, 0);

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form, items);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    // Guard: duplicate products
    const productIds = items.map((i) => i.product);
    const hasDupes = productIds.length !== new Set(productIds).size;
    if (hasDupes) {
      toast.error('Each product can only appear once. Adjust quantities instead.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        // Edit mode: only update status/payment via PATCH
        await api.patch(`/orders/${order._id}/status`, {
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
        });
        toast.success('Order updated');
      } else {
        const payload = {
          customer: form.customer,
          items: items.map((i) => ({
            product: i.product,
            quantity: Number(i.quantity),
          })),
          orderType: form.orderType,
          paymentMethod: form.paymentMethod,
          discountAmount: Number(form.discountAmount || 0),
          notes: form.notes,
        };
        const result = await dispatch(createOrder(payload)).unwrap();
        toast.success(`Order ${result.order.orderNumber} created`);
      }
      onClose();
    } catch (err) {
      const msg = typeof err === 'string' ? err : err?.message || 'Something went wrong';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `✏️ Edit Order — ${order?.orderNumber}` : '📦 New Order'}
      size="xl"
    >
      {loadingData ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          Loading data...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>

          {/* ── Section 1: Customer & Meta ── */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Order Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Select
                  label="Customer *"
                  name="customer"
                  value={form.customer}
                  onChange={handleChange}
                  error={errors.customer}
                  disabled={isEdit}
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} — {c.phone}
                    </option>
                  ))}
                </Select>
              </div>

              <Select
                label="Order Type"
                name="orderType"
                value={form.orderType}
                onChange={handleChange}
                disabled={isEdit}
              >
                <option value="offline">Offline (Walk-in)</option>
                <option value="online">Online</option>
              </Select>
            </div>
          </div>

          {/* ── Section 2: Line Items ── */}
          {!isEdit && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Items
              </h4>

              {errors.itemsEmpty && (
                <p className="text-xs text-red-500 mb-2">{errors.itemsEmpty}</p>
              )}

              {/* Column headers */}
              <div className="grid grid-cols-12 gap-2 mb-1 px-0.5">
                <span className="col-span-6 text-xs text-gray-500 font-medium">Product</span>
                <span className="col-span-2 text-xs text-gray-500 font-medium">Qty</span>
                <span className="col-span-3 text-xs text-gray-500 font-medium">Subtotal</span>
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => (
                  <OrderItemRow
                    key={idx}
                    item={item}
                    index={idx}
                    products={products}
                    onChange={handleItemChange}
                    onRemove={removeItem}
                    errors={errors.items?.[idx] || {}}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={addItem}
                className="mt-3 text-sm text-green-600 hover:text-green-800 font-medium flex items-center gap-1"
              >
                + Add Item
              </button>
            </div>
          )}

          {/* ── Section 3: Payment & Totals ── */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Payment
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Payment Method"
                name="paymentMethod"
                value={form.paymentMethod}
                onChange={handleChange}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="credit">Credit</option>
                <option value="bank_transfer">Bank Transfer</option>
              </Select>

              <Input
                label="Discount (₹)"
                name="discountAmount"
                type="number"
                min="0"
                value={form.discountAmount}
                onChange={handleChange}
                error={errors.discountAmount}
                disabled={isEdit}
              />

              {/* Amount summary */}
              {!isEdit && (
                <div className="flex flex-col justify-end gap-0.5">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span>₹{totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Discount</span>
                    <span>− ₹{discount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-green-700 border-t pt-1 mt-1">
                    <span>Total</span>
                    <span>₹{finalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <Textarea
            label="Notes"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Optional notes for this order..."
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? 'Save Changes' : 'Place Order'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default OrderForm;