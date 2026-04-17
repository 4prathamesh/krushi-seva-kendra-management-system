import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { createInvoice } from '../features/invoices/invoiceSlice';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import InvoicePrint from '../components/common/InvoicePrint';
import api from '../services/api';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const GST_RATES = [0, 5, 12, 18, 28];
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
  const paidAmt = Number(form.paidAmount);
  if (isNaN(paidAmt) || paidAmt < 0) errs.paidAmount = 'Must be ≥ 0';

  if (items.length === 0) {
    errs.items = 'Add at least one item';
  } else {
    const itemErrs = items.map((item) => {
      const e = {};
      if (!item.productId) e.productId = 'Select a product';
      if (!item.quantity || Number(item.quantity) < 1) e.quantity = 'Min qty: 1';
      if (item.price === '' || Number(item.price) < 0) e.price = 'Invalid price';
      if (item.productId && item.quantity) {
        const prod = products.find((p) => p._id === item.productId);
        if (prod && Number(item.quantity) > prod.stock) e.quantity = `Max ${prod.stock} ${prod.unit}`;
      }
      return e;
    });
    if (itemErrs.some((e) => Object.keys(e).length > 0)) errs.itemErrs = itemErrs;
  }
  return errs;
};

const emptyItem = () => ({
  productId: '', productName: '', hsn: '', batch: '', expiry: '',
  quantity: '1', price: '', gstRate: '0',
  lineSubtotal: 0, gstAmount: 0, cgst: 0, sgst: 0, total: 0,
});

// ─── Item Row ─────────────────────────────────────────────────────────────────
const ItemRow = ({ item, index, products, onChange, onRemove, errors = {} }) => {
  const selectedProd = products.find((p) => p._id === item.productId);

  const handleProductChange = (productId) => {
    const prod = products.find((p) => p._id === productId);
    if (!prod) { onChange(index, emptyItem()); return; }
    const updated = {
      ...item,
      productId: prod._id, productName: prod.name,
      hsn: prod.hsn || '', batch: prod.batch || '', expiry: prod.expiry || '',
      price: String(prod.pricePerUnit), gstRate: String(prod.gstRate ?? 0),
    };
    onChange(index, { ...updated, ...calcLine(updated.price, updated.quantity, updated.gstRate) });
  };

  const handleField = (field, value) => {
    const updated = { ...item, [field]: value };
    onChange(index, { ...updated, ...calcLine(updated.price || 0, updated.quantity || 0, updated.gstRate || 0) });
  };

  const inp = (hasErr) =>
    `w-full border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-500 bg-white ${hasErr ? 'border-red-400' : 'border-gray-300'}`;

  return (
    <tr className="align-top border-b border-gray-100">
      <td className="px-1 py-1">
        <select value={item.productId} onChange={(e) => handleProductChange(e.target.value)}
          className={inp(errors.productId) + ' min-w-[180px]'}>
          <option value="">Select product</option>
          {products.map((p) => (
            <option key={p._id} value={p._id} disabled={p.stock === 0}>
              {p.name} — ₹{p.pricePerUnit} (Stk: {p.stock})
            </option>
          ))}
        </select>
        {errors.productId && <p className="text-red-500 text-[10px] mt-0.5">{errors.productId}</p>}
      </td>
      <td className="px-1 py-1">
        <input value={item.hsn} onChange={(e) => handleField('hsn', e.target.value)} className={inp(false) + ' w-16'} placeholder="HSN" />
      </td>
      <td className="px-1 py-1">
        <input value={item.batch} onChange={(e) => handleField('batch', e.target.value)} className={inp(false) + ' w-20'} placeholder="Batch" />
      </td>
      <td className="px-1 py-1">
        <input value={item.expiry} onChange={(e) => handleField('expiry', e.target.value)} className={inp(false) + ' w-20'} placeholder="Feb 2026" />
      </td>
      <td className="px-1 py-1">
        <input type="number" min="1" max={selectedProd?.stock || 9999} value={item.quantity}
          onChange={(e) => handleField('quantity', e.target.value)} className={inp(errors.quantity) + ' w-14 text-right'} />
        {errors.quantity && <p className="text-red-500 text-[10px]">{errors.quantity}</p>}
      </td>
      <td className="px-1 py-1">
        <input type="number" min="0" step="0.01" value={item.price}
          onChange={(e) => handleField('price', e.target.value)} className={inp(errors.price) + ' w-20 text-right'} />
        {errors.price && <p className="text-red-500 text-[10px]">{errors.price}</p>}
      </td>
      <td className="px-1 py-1">
        <select value={item.gstRate} onChange={(e) => handleField('gstRate', e.target.value)} className={inp(false) + ' w-16'}>
          {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
        </select>
      </td>
      <td className="px-1 py-1 text-right text-xs text-gray-500 w-16">{round2(item.cgst).toFixed(2)}</td>
      <td className="px-1 py-1 text-right text-xs text-gray-500 w-16">{round2(item.sgst).toFixed(2)}</td>
      <td className="px-1 py-1 text-right text-xs font-semibold text-gray-800 w-20">
        ₹{round2(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </td>
      <td className="px-1 py-1 text-center w-8">
        <button type="button" onClick={() => onRemove(index)}
          className="text-red-400 hover:text-red-600 text-lg font-bold leading-none" title="Remove">×</button>
      </td>
    </tr>
  );
};

// ─── Main Billing Page ────────────────────────────────────────────────────────
const Billing = () => {
  const dispatch = useDispatch();

  const [form, setForm] = useState({
    customerName: '', mobile: '', village: '', taluka: '', district: '',
    paidAmount: '', openingBalance: '0', paymentMode: 'cash',
  });
  const [items, setItems]           = useState([emptyItem()]);
  const [products, setProducts]     = useState([]);
  const [loadingProd, setLoadProd]  = useState(false);
  const [errors, setErrors]         = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [printInvoice, setPrintInv] = useState(null);

  // Customer auto-fill state
  const [lookingUp, setLookingUp]         = useState(false);
  const [foundCustomer, setFoundCustomer] = useState(null); // null | customer object
  const lookupTimer                       = useRef(null);

  // ── Load products ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadProd(true);
      try {
        const res = await api.get('/products', { params: { limit: 500 } });
        if (!cancelled) setProducts(res.data.data.products.filter((p) => p.isActive));
      } catch { if (!cancelled) toast.error('Failed to load products'); }
      finally  { if (!cancelled) setLoadProd(false); }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Mobile-number triggered customer lookup (debounced 600ms) ─────────────
  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm((p) => ({ ...p, mobile: val }));
    setErrors((p) => ({ ...p, mobile: '' }));
    setFoundCustomer(null);

    clearTimeout(lookupTimer.current);
    if (/^[6-9]\d{9}$/.test(val)) {
      lookupTimer.current = setTimeout(async () => {
        setLookingUp(true);
        try {
          const res = await api.get('/invoices/lookup', { params: { mobile: val } });
          const customer = res.data.data.customer;
          if (customer) {
            setFoundCustomer(customer);
            // Auto-fill customer details
            setForm((p) => ({
              ...p,
              customerName:    customer.name    || p.customerName,
              village:         customer.village || p.village,
              taluka:          customer.taluka  || p.taluka,
              district:        customer.district|| p.district,
              openingBalance:  String(customer.creditBalance || 0),
            }));
            toast.success(`Customer found: ${customer.name}`);
          }
        } catch { /* silently fail — user will enter name manually */ }
        finally { setLookingUp(false); }
      }, 600);
    }
  };

  // ── Form field change ──────────────────────────────────────────────────────
  const handleFormChange = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: '' }));
  };

  // ── Item handlers ──────────────────────────────────────────────────────────
  const handleItemChange = useCallback((index, updated) => {
    setItems((prev) => prev.map((item, i) => (i === index ? updated : item)));
    setErrors((prev) => {
      if (!prev.itemErrs) return prev;
      const errs = [...prev.itemErrs];
      if (errs[index]) errs[index] = {};
      return { ...prev, itemErrs: errs };
    });
  }, []);

  const addItem    = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  // ── Computed totals ────────────────────────────────────────────────────────
  const subTotal   = round2(items.reduce((s, i) => s + (i.lineSubtotal || 0), 0));
  const cgstTotal  = round2(items.reduce((s, i) => s + (i.cgst || 0), 0));
  const sgstTotal  = round2(items.reduce((s, i) => s + (i.sgst || 0), 0));
  const totalGST   = round2(cgstTotal + sgstTotal);
  const grandTotal = round2(subTotal + totalGST);
  const paidAmt    = round2(Math.min(Number(form.paidAmount) || 0, grandTotal));
  const dueAmt     = round2(grandTotal - paidAmt);

  const paymentStatus =
    paidAmt <= 0               ? 'credit'
    : dueAmt <= 0              ? 'paid'
    :                            'partial';

  const paymentStatusBadge = {
    paid:    { label: 'Fully Paid',    cls: 'bg-green-100 text-green-700' },
    partial: { label: 'Partial / Udhar', cls: 'bg-yellow-100 text-yellow-700' },
    credit:  { label: 'Full Udhar',    cls: 'bg-red-100 text-red-700' },
  }[paymentStatus];

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm({ customerName: '', mobile: '', village: '', taluka: '', district: '', paidAmount: '', openingBalance: '0', paymentMode: 'cash' });
    setItems([emptyItem()]);
    setErrors({});
    setFoundCustomer(null);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const filledItems = items.filter((i) => i.productId);
    const errs = validate(form, filledItems, products);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const result = await dispatch(createInvoice({
        customerName:   form.customerName.trim(),
        mobile:         form.mobile.trim(),
        village:        form.village.trim(),
        taluka:         form.taluka.trim(),
        district:       form.district.trim(),
        paidAmount:     Number(form.paidAmount) || 0,
        paymentMode:    paymentStatus === 'credit' ? 'none' : form.paymentMode,
        openingBalance: Number(form.openingBalance) || 0,
        items: filledItems.map((item) => ({
          productId: item.productId, quantity: Number(item.quantity),
          price: Number(item.price), gstRate: Number(item.gstRate),
          hsn: item.hsn, batch: item.batch, expiry: item.expiry,
        })),
      })).unwrap();

      const inv = result.invoice;
      toast.success(`Invoice ${inv.invoiceNumber} created!`);
      if (inv.dueAmount > 0) toast(`₹${inv.dueAmount.toFixed(2)} added to customer credit (Udhar)`, { icon: '📒' });
      setPrintInv(inv);
      resetForm();
      // Refresh stock
      api.get('/products', { params: { limit: 500 } })
        .then((res) => setProducts(res.data.data.products.filter((p) => p.isActive)))
        .catch(() => {});
    } catch (err) {
      toast.error(typeof err === 'string' ? err : (err?.message || 'Failed to create invoice'));
    } finally {
      setSubmitting(false);
    }
  };

  const thCls = 'text-left px-2 py-2 text-gray-600 uppercase text-[10px] font-semibold whitespace-nowrap bg-gray-50';

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">🧾 New Invoice</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full font-medium">
            B2C · CGST + SGST · Smart customer lookup
          </span>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* ── Customer Details ── */}
          <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Customer Details</p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-3">
              {/* Mobile — lookup trigger */}
              <div className="relative">
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Mobile * {lookingUp && <span className="text-xs text-blue-500 font-normal">Searching…</span>}
                </label>
                <input
                  type="tel" maxLength={10} value={form.mobile}
                  onChange={handleMobileChange}
                  placeholder="9876543210"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.mobile ? 'border-red-400' : 'border-gray-300'}`}
                />
                {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}
                {/* Found / new customer badge */}
                {foundCustomer && (
                  <div className="mt-1.5 text-xs flex items-center gap-1.5 text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-1">
                    <span>✓</span>
                    <span>Existing customer — details filled</span>
                    {foundCustomer.creditBalance > 0 && (
                      <span className="ml-auto font-semibold text-red-600">
                        Udhar: ₹{foundCustomer.creditBalance.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Customer Name */}
              <div className="sm:col-span-2">
                <Input label="Customer Name *" value={form.customerName}
                  onChange={(e) => handleFormChange('customerName', e.target.value)}
                  placeholder="e.g. Suraj Shinde" error={errors.customerName} />
              </div>

              {/* Village */}
              <Input label="Village" value={form.village}
                onChange={(e) => handleFormChange('village', e.target.value)}
                placeholder="e.g. Jujarpur" />
            </div>

            {/* Payment section */}
            <div className="border-t border-gray-100 pt-4 mt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Payment</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">

                {/* Payment mode — disabled when credit */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Mode</label>
                  <div className="flex gap-3">
                    {['cash', 'upi', 'card'].map((mode) => (
                      <label key={mode} className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input type="radio" name="paymentMode" value={mode}
                          checked={form.paymentMode === mode}
                          onChange={() => handleFormChange('paymentMode', mode)}
                          className="accent-green-600 w-4 h-4" />
                        <span className="text-sm capitalize">{mode.toUpperCase()}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Paid amount */}
                <div>
                  <Input label="Amount Paid (₹)" type="number" min="0" step="0.01"
                    value={form.paidAmount}
                    onChange={(e) => handleFormChange('paidAmount', e.target.value)}
                    placeholder="Leave blank for full Udhar"
                    error={errors.paidAmount} />
                </div>

                {/* Opening balance (pre-filled from customer credit) */}
                <div>
                  <Input label="Opening Balance (₹)" type="number" min="0"
                    value={form.openingBalance}
                    onChange={(e) => handleFormChange('openingBalance', e.target.value)}
                    placeholder="0" />
                </div>

                {/* Live payment status badge */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">Status (live)</span>
                  <div className={`text-xs font-semibold px-3 py-2 rounded-lg ${paymentStatusBadge.cls}`}>
                    {paymentStatusBadge.label}
                    {dueAmt > 0 && ` · ₹${dueAmt.toFixed(2)} due`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Items Table ── */}
          <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Items</p>
            {errors.items && <p className="text-red-500 text-xs mb-2">⚠ {errors.items}</p>}

            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm min-w-[860px] px-2">
                <thead>
                  <tr>
                    <th className={thCls}>Product</th>
                    <th className={thCls}>HSN</th>
                    <th className={thCls}>Batch</th>
                    <th className={thCls}>Expiry</th>
                    <th className={thCls + ' text-right'}>Qty</th>
                    <th className={thCls + ' text-right'}>Rate (₹)</th>
                    <th className={thCls + ' text-center'}>GST%</th>
                    <th className={thCls + ' text-right'}>CGST</th>
                    <th className={thCls + ' text-right'}>SGST</th>
                    <th className={thCls + ' text-right'}>Total</th>
                    <th className={thCls + ' w-8'}></th>
                  </tr>
                </thead>
                <tbody>
                  {loadingProd ? (
                    <tr><td colSpan={11} className="text-center py-6 text-gray-400 text-sm">Loading products…</td></tr>
                  ) : (
                    items.map((item, idx) => (
                      <ItemRow key={idx} item={item} index={idx} products={products}
                        onChange={handleItemChange} onRemove={removeItem}
                        errors={errors.itemErrs?.[idx] || {}} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addItem}
              className="mt-3 text-sm text-green-600 hover:text-green-800 font-medium flex items-center gap-1">
              + Add Item
            </button>
          </div>

          {/* ── Totals + Actions ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* GST + Payment Summary */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Summary</p>
              <div className="space-y-2 text-sm">
                {[
                  ['Subtotal (taxable)', `₹${subTotal.toFixed(2)}`],
                  ['CGST', `₹${cgstTotal.toFixed(2)}`],
                  ['SGST', `₹${sgstTotal.toFixed(2)}`],
                  ['Total GST', `₹${totalGST.toFixed(2)}`],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-gray-600">
                    <span>{l}</span><span>{v}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-base text-green-700 border-t pt-2 mt-1">
                  <span>Grand Total</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
                {paidAmt > 0 && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>Paid now</span><span>₹{paidAmt.toFixed(2)}</span>
                  </div>
                )}
                {dueAmt > 0 && (
                  <div className="flex justify-between text-sm font-semibold text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    <span>📒 Udhar (credit)</span><span>₹{dueAmt.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col justify-between">
              <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                <li>Mobile number auto-fills existing customer details</li>
                <li>New customers are created automatically</li>
                <li>Leave "Amount Paid" blank for full Udhar billing</li>
                <li>Partial amount creates credit balance automatically</li>
                <li>Stock reduces immediately on save</li>
              </ul>
              <div className="flex gap-3 mt-4">
                <Button type="button" variant="secondary" onClick={resetForm} disabled={submitting} className="flex-1">
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

      {printInvoice && <InvoicePrint invoice={printInvoice} onClose={() => setPrintInv(null)} />}
    </>
  );
};

export default Billing;
