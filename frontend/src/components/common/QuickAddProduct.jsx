/**
 * QuickAddProduct — lightweight inline product creator.
 *
 * Used inside Purchase and Billing forms when a product isn't in the list.
 * Does NOT use Redux or the full ProductForm modal — it posts directly via api
 * so the parent form context is never lost.
 *
 * Props:
 *   isOpen     {boolean}
 *   onClose    {() => void}
 *   onCreated  {(product) => void}  — called with the new product object
 *   initialName {string}            — pre-fills the name field (from what user typed)
 */

import { useState } from 'react';
import Modal from '../ui/Modal';
import Input from './Input';
import Button from './Button';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['seed', 'fertilizer', 'pesticide', 'tool', 'other'];
const UNITS      = ['kg', 'g', 'litre', 'ml', 'packet', 'bag', 'piece'];
const GST_RATES  = [0, 5, 12, 18, 28];

const EMPTY = {
  name: '', category: '', unit: '',
  pricePerUnit: '', stock: '0',
  gstRate: '0', hsn: '', batch: '', expiry: '',
};

const validate = (f) => {
  const e = {};
  if (!f.name.trim())         e.name        = 'Product name is required';
  if (!f.category)            e.category    = 'Category is required';
  if (!f.unit)                e.unit        = 'Unit is required';
  if (!f.pricePerUnit || Number(f.pricePerUnit) < 0) e.pricePerUnit = 'Enter a valid price';
  return e;
};

const QuickAddProduct = ({ isOpen, onClose, onCreated, initialName = '' }) => {
  const [form, setForm]         = useState({ ...EMPTY, name: initialName });
  const [errors, setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Reset when opened with a new initialName
  useState(() => {
    if (isOpen) setForm({ ...EMPTY, name: initialName });
    setErrors({});
  }, [isOpen, initialName]);

  const set = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      // Use FormData so it matches the multipart endpoint (image is optional here)
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v !== '' && fd.append(k, v));

      const res = await api.post('/products', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newProduct = res.data.data.product;
      toast.success(`"${newProduct.name}" added to products`);
      onCreated(newProduct);   // parent selects it in the row immediately
      onClose();
      setForm({ ...EMPTY, name: initialName });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add product');
    } finally {
      setSubmitting(false);
    }
  };

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500';
  const sel = inp;
  const lbl = 'text-sm font-medium text-gray-700 block mb-1.5';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🌱 Quick Add Product" size="md">
      <p className="text-xs text-gray-400 mb-4">
        Fill the essential fields — you can edit more details later from the Products page.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">

        {/* Name */}
        <div>
          <label className={lbl}>Product Name *</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. DAP Fertilizer 50kg" className={inp} />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        {/* Category + Unit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Category *</label>
            <select value={form.category} onChange={(e) => set('category', e.target.value)} className={sel}>
              <option value="">Select</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
          </div>
          <div>
            <label className={lbl}>Unit *</label>
            <select value={form.unit} onChange={(e) => set('unit', e.target.value)} className={sel}>
              <option value="">Select</option>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit}</p>}
          </div>
        </div>

        {/* Price + GST */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Selling Price / Unit (₹) *</label>
            <input type="number" min="0" step="0.01"
              value={form.pricePerUnit} onChange={(e) => set('pricePerUnit', e.target.value)}
              placeholder="0.00" className={inp} />
            {errors.pricePerUnit && <p className="text-red-500 text-xs mt-1">{errors.pricePerUnit}</p>}
          </div>
          <div>
            <label className={lbl}>GST Rate</label>
            <select value={form.gstRate} onChange={(e) => set('gstRate', e.target.value)} className={sel}>
              {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>
        </div>

        {/* HSN + Batch + Expiry — billing fields */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={lbl}>HSN Code</label>
            <input value={form.hsn} onChange={(e) => set('hsn', e.target.value)}
              placeholder="e.g. 3105" className={inp} />
          </div>
          <div>
            <label className={lbl}>Batch No.</label>
            <input value={form.batch} onChange={(e) => set('batch', e.target.value)}
              placeholder="e.g. WE/854" className={inp} />
          </div>
          <div>
            <label className={lbl}>Expiry</label>
            <input value={form.expiry} onChange={(e) => set('expiry', e.target.value)}
              placeholder="e.g. Feb 2027" className={inp} />
          </div>
        </div>

        {/* Info note */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-600">
          💡 Stock will be set to <strong>0</strong> — it will increase automatically when you save this purchase.
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            🌱 Add Product
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default QuickAddProduct;
