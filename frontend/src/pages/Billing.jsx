import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { createInvoice } from '../features/invoices/invoiceSlice';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import InvoicePrint from '../components/common/InvoicePrint';
import api from '../services/api';
import toast from 'react-hot-toast';

// ─── GST rate options (matching backend) ──────────────────────────────────────
const GST_RATES = [0, 5, 12, 18, 28];

// ─── Client-side GST calculation (mirrors backend gst.js) ────────────────────
const round2 = (n) => Math.round(n * 100) / 100;

const calcLine = (price, qty, gstRate) => {
  const lineSubtotal = round2(Number(price) * Number(qty));
  const gstAmount    = round2(lineSubtotal * (Number(gstRate) / 100));
  const cgst         = round2(gstAmount / 2);
  const sgst         = round2(gstAmount / 2);
  const total        = round2(lineSubtotal + cgst + sgst);
  return { lineSubtotal, gstAmount: round2(cgst + sgst), cgst, sgst, total };
};

// ─── Validation ───────────────────────────────────────────────────────────────
const validate = (form, items, products) => {
  const errs = {};
  if (!form.customerName.trim()) errs.customerName = 'Customer name is required';
  if (!form.mobile.trim()) {
    errs.mobile = 'Mobile number is required';
  } else if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) {
    errs.mobile = 'Enter a valid 10-digit mobile number';
  }
  if (items.length === 0) errs.items = 'Add at least one item';
  const itemErrs = items.map((item) => {
    const e = {};
    if (!item.productId) e.productId = 'Select a product';
    if (!item.quantity || Number(item.quantity) < 1) e.quantity = 'Min 1';
    if (!item.price || Number(item.price) < 0) e.price = 'Invalid price';
    if (item.productId && item.quantity) {
      const prod = products.find((p) => p._id === item.productId);
      if (prod && Number(item.quantity) > prod.stock) {
        e.quantity = `Max ${prod.stock} (available stock)`;
      }
    }
    return e;
  });
  if (itemErrs.some((e) => Object.keys(e).length > 0)) errs.itemErrs = itemErrs;
  return errs;
};

// ─── Empty item template ──────────────────────────────────────────────────────
const emptyItem = () => ({
  productId: '',
  productName: '',
  hsn: '',
  batch: '',
  expiry: '',
  quantity: '1',
  price: '',
  gstRate: '0',
  // computed fields (updated on every change)
  lineSubtotal: 0,
  gstAmount: 0,
  cgst: 0,
  sgst: 0,
  total: 0,
});

// ─── Single item row component ────────────────────────────────────────────────
const ItemRow = ({ item, index, products, onChange, onRemove, errors = {} }) => {
  const selectedProd = products.find((p) => p._id === item.productId);

  const handleProductChange = (productId) => {
    const prod = products.find((p) => p._id === productId);
    if (!prod) { onChange(index, { ...emptyItem() }); return; }
    const updated = {
      ...item,
      productId: prod._id,
      productName: prod.name,
      hsn:     prod.hsn    || '',
      batch:   prod.batch  || '',
      expiry:  prod.expiry || '',
      price:   String(prod.pricePerUnit),
      gstRate: String(prod.gstRate ?? 0),
    };
    const calc = calcLine(updated.price, updated.quantity, updated.gstRate);
    onChange(index, { ...updated, ...calc });
  };

  const handleField = (field, value) => {
    const updated = { ...item, [field]: value };
    const calc = calcLine(
      updated.price    || 0,
      updated.quantity || 0,
      updated.gstRate  || 0,
    );
    onChange(index, { ...updated, ...calc });
  };

  return (
    <tr className="align-top">
      {/* Product */}
      <td className="px-2 py-1">
        <select
          value={item.productId}
          onChange={(e) => handleProductChange(e.target.value)}
          className={`w-full border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 ${
            errors.productId ? 'border-red-400' : 'border-gray-300'
          }`}
        >
          <option value="">Select product</option>
          {products.map((p) => (
            <option key={p._id} value={p._id} disabled={p.stock === 0}>
              {p.name} — ₹{p.pricePerUnit} | Stk: {p.stock}
            </option>
          ))}
        </select>
        {errors.productId && <p className="text-red-500 text-[10px] mt-0.5">{errors.productId}</p>}
      </td>

      {/* HSN */}
      <td className="px-1 py-1">
        <input
          value={item.hsn}
          onChange={(e) => handleField('hsn', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="HSN"
        />
      </td>

      {/* Batch */}
      <td className="px-1 py-1">
        <input
          value={item.batch}
          onChange={(e) => handleField('batch', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Batch"
        />
      </td>

      {/* Expiry */}
      <td className="px-1 py-1">
        <input
          value={item.expiry}
          onChange={(e) => handleField('expiry', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Feb 2026"
        />
      </td>

      {/* Qty */}
      <td className="px-1 py-1 w-16">
        <input
          type="number"
          min="1"
          max={selectedProd?.stock || 9999}
          value={item.quantity}
          onChange={(e) => handleField('quantity', e.target.value)}
          className={`w-full border rounded-md px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-green-500 ${
            errors.quantity ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {errors.quantity && <p className="text-red-500 text-[10px]">{errors.quantity}</p>}
      </td>

      {/* Rate */}
      <td className="px-1 py-1 w-20">
        <input
          type="number"
          min="0"
          step="0.01"
          value={item.price}
          onChange={(e) => handleField('price', e.target.value)}
          className={`w-full border rounded-md px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-green-500 ${
            errors.price ? 'border-red-400' : 'border-gray-300'
          }`}
        />
      </td>

      {/* GST % */}
      <td className="px-1 py-1 w-16">
        <select
          value={item.gstRate}
          onChange={(e) => handleField('gstRate', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-1 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {GST_RATES.map((r) => (
            <option key={r} value={r}>{r}%</option>
          ))}
        </select>
      </td>

      {/* CGST */}
      <td className="px-1 py-1 text-right text-xs w-16 text-gray-600">
        {round2(item.cgst).toFixed(2)}
      </td>

      {/* SGST */}
      <td className="px-1 py-1 text-right text-xs w-16 text-gray-600">
        {round2(item.sgst).toFixed(2)}
      </td>

      {/* Total */}
      <td className="px-1 py-1 text-right text-xs w-20 font-semibold text-gray-800">
        ₹{round2(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </td>

      {/* Remove */}
      <td className="px-1 py-1 w-8 text-center">
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-red-400 hover:text-red-600 text-lg leading-none"
          title="Remove item"
        >
          ×
        </button>
      </td>
    </tr>
  );
};

// ─── Main Billing Page ────────────────────────────────────────────────────────
const Billing = () => {
  const dispatch = useDispatch();

  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile]             = useState('');
  const [openingBalance, setOpBal]      = useState('0');
  const [paymentMode, setPaymentMode]   = useState('cash');

  // Items
  const [items, setItems] = useState([emptyItem()]);

  // Products list (fetched once)
  const [products, setProducts] = useState([]);
  const [loadingProd, setLoadProd] = useState(false);

  // UI state
  const [errors, setErrors]       = useState({});
  const [submitting, setSubmit]   = useState(false);
  const [printInvoice, setPrintInv] = useState(null); // set to invoice obj to open print view

  // ── Fetch products ────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadProd(true);
      try {
        const res = await api.get('/products', { params: { limit: 500 } });
        setProducts(res.data.data.products.filter((p) => p.isActive));
      } catch {
        toast.error('Failed to load products');
      } finally {
        setLoadProd(false);
      }
    };
    load();
  }, []);

  // ── Item handlers ─────────────────────────────────────────────────────────
  const handleItemChange = useCallback((index, updated) => {
    setItems((prev) => prev.map((item, i) => (i === index ? updated : item)));
    // Clear item-level errors
    setErrors((prev) => {
      if (!prev.itemErrs) return prev;
      const errs = [...prev.itemErrs];
      errs[index] = {};
      return { ...prev, itemErrs: errs };
    });
  }, []);

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Computed totals (live) ────────────────────────────────────────────────
  const subTotal  = round2(items.reduce((s, i) => s + (i.lineSubtotal || 0), 0));
  const cgstTotal = round2(items.reduce((s, i) => s + (i.cgst || 0), 0));
  const sgstTotal = round2(items.reduce((s, i) => s + (i.sgst || 0), 0));
  const totalGST  = round2(cgstTotal + sgstTotal);
  const grandTotal = round2(subTotal + totalGST);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const filledItems = items.filter((i) => i.productId); // ignore blank rows
    const errs = validate({ customerName, mobile }, filledItems, products);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmit(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        mobile: mobile.trim(),
        openingBalance: Number(openingBalance || 0),
        paymentMode,
        items: filledItems.map((item) => ({
          productId: item.productId,
          quantity:  Number(item.quantity),
          price:     Number(item.price),
          gstRate:   Number(item.gstRate),
          hsn:       item.hsn,
          batch:     item.batch,
          expiry:    item.expiry,
        })),
      };

      const result = await dispatch(createInvoice(payload)).unwrap();
      toast.success(`Invoice ${result.invoice.invoiceNumber} created!`);
      setPrintInv(result.invoice); // open print view immediately
      resetForm();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to create invoice');
    } finally {
      setSubmit(false);
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setMobile('');
    setOpBal('0');
    setPaymentMode('cash');
    setItems([emptyItem()]);
    setErrors({});
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">🧾 New Invoice</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
            B2C · CGST + SGST
          </span>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* ── Customer Details ── */}
          <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Customer Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Customer Name *"
                  value={customerName}
                  onChange={(e) => { setCustomerName(e.target.value); setErrors((p) => ({...p, customerName: ''})); }}
                  placeholder="e.g. Suraj Shinde"
                  error={errors.customerName}
                />
              </div>
              <Input
                label="Mobile *"
                value={mobile}
                onChange={(e) => { setMobile(e.target.value); setErrors((p) => ({...p, mobile: ''})); }}
                placeholder="9119471967"
                maxLength={10}
                error={errors.mobile}
              />
              <Input
                label="Opening Balance (₹)"
                type="number"
                min="0"
                value={openingBalance}
                onChange={(e) => setOpBal(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="mt-3">
              <label className="text-sm font-medium text-gray-700 block mb-1">Payment Mode</label>
              <div className="flex gap-3">
                {['cash', 'upi', 'card'].map((mode) => (
                  <label key={mode} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMode"
                      value={mode}
                      checked={paymentMode === mode}
                      onChange={() => setPaymentMode(mode)}
                      className="accent-green-600"
                    />
                    <span className="text-sm capitalize font-medium">{mode.toUpperCase()}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ── Items Table ── */}
          <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Items
            </p>
            {errors.items && <p className="text-red-500 text-xs mb-2">{errors.items}</p>}

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs uppercase">
                    <th className="text-left px-2 py-2">Product</th>
                    <th className="text-left px-1 py-2 w-16">HSN</th>
                    <th className="text-left px-1 py-2 w-20">Batch</th>
                    <th className="text-left px-1 py-2 w-20">Expiry</th>
                    <th className="text-right px-1 py-2 w-16">Qty</th>
                    <th className="text-right px-1 py-2 w-20">Rate (₹)</th>
                    <th className="text-center px-1 py-2 w-16">GST%</th>
                    <th className="text-right px-1 py-2 w-16">CGST</th>
                    <th className="text-right px-1 py-2 w-16">SGST</th>
                    <th className="text-right px-1 py-2 w-20">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingProd ? (
                    <tr>
                      <td colSpan={11} className="text-center py-6 text-gray-400">
                        Loading products...
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <ItemRow
                        key={idx}
                        item={item}
                        index={idx}
                        products={products}
                        onChange={handleItemChange}
                        onRemove={removeItem}
                        errors={errors.itemErrs?.[idx] || {}}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="mt-3 text-sm text-green-600 hover:text-green-800 font-medium"
            >
              + Add Item
            </button>
          </div>

          {/* ── GST Summary & Submit ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* GST Breakdown */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                GST Summary
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal (taxable)</span>
                  <span>₹{subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>CGST</span>
                  <span>₹{cgstTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>SGST</span>
                  <span>₹{sgstTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500 text-xs">
                  <span>Total GST</span>
                  <span>₹{totalGST.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base text-green-700 border-t pt-2 mt-1">
                  <span>Grand Total</span>
                  <span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col justify-between">
              <div className="text-xs text-gray-400 space-y-1">
                <p>• Invoice number is auto-generated (INV-YYYY-NNNN)</p>
                <p>• Stock is deducted immediately on save</p>
                <p>• CGST and SGST are split 50/50 (same-state B2C)</p>
              </div>
              <div className="flex gap-3 mt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetForm}
                  disabled={submitting}
                  className="flex-1"
                >
                  Clear
                </Button>
                <Button type="submit" loading={submitting} className="flex-1">
                  🧾 Save &amp; Print
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* ── Print View overlay ── */}
      {printInvoice && (
        <InvoicePrint
          invoice={printInvoice}
          onClose={() => setPrintInv(null)}
        />
      )}
    </>
  );
};

export default Billing;
