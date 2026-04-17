import { useState, useEffect } from 'react';
import purchaseService from '../services/purchase.service';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Modal from '../components/ui/Modal';
import Select from '../components/common/Select';
import api from '../services/api';
import toast from 'react-hot-toast';

const emptyItem = () => ({ productId: '', quantity: '1', price: '' });

const PurchaseForm = ({ isOpen, onClose, onCreated }) => {
  const [form, setForm] = useState({
    supplierName: '', supplierPhone: '', supplierAddress: '',
    paymentMode: 'cash', paidAmount: '', purchaseDate: '', notes: '',
  });
  const [items, setItems]         = useState([emptyItem()]);
  const [products, setProducts]   = useState([]);
  const [errors, setErrors]       = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    api.get('/products', { params: { limit: 500 } })
      .then((r) => { if (!cancelled) setProducts(r.data.data.products.filter((p) => p.isActive)); })
      .catch(() => {});
    setForm({ supplierName:'', supplierPhone:'', supplierAddress:'', paymentMode:'cash', paidAmount:'', purchaseDate:'', notes:'' });
    setItems([emptyItem()]);
    setErrors({});
    return () => { cancelled = true; };
  }, [isOpen]);

  const handleField = (field, value) => setForm((p) => ({ ...p, [field]: value }));
  const handleItem  = (i, field, value) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  const addItem     = () => setItems((p) => [...p, emptyItem()]);
  const removeItem  = (i) => setItems((p) => p.filter((_, idx) => idx !== i));

  const totalAmount = items.reduce((s, it) => {
    const prod = products.find((p) => p._id === it.productId);
    return s + (prod ? (Number(it.quantity) || 0) * (Number(it.price) || prod.pricePerUnit) : 0);
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplierName.trim()) { setErrors({ supplierName: 'Supplier name required' }); return; }
    const filled = items.filter((i) => i.productId);
    if (filled.length === 0) { toast.error('Add at least one product'); return; }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        paidAmount: Number(form.paidAmount) || 0,
        items: filled.map((i) => {
          const prod = products.find((p) => p._id === i.productId);
          return { productId: i.productId, quantity: Number(i.quantity), price: Number(i.price) || prod?.pricePerUnit || 0 };
        }),
      };
      const result = await purchaseService.create(payload);
      toast.success(`Purchase ${result.purchase.purchaseNumber} recorded — stock updated`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record purchase');
    } finally {
      setSubmitting(false);
    }
  };

  const inp = 'w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-500 bg-white';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📥 New Purchase (Stock In)" size="xl">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Supplier Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Supplier Name *" value={form.supplierName} error={errors.supplierName}
              onChange={(e) => handleField('supplierName', e.target.value)} placeholder="e.g. Kalyani Agro Dist." />
            <Input label="Phone" value={form.supplierPhone}
              onChange={(e) => handleField('supplierPhone', e.target.value)} placeholder="Mobile number" />
            <Input label="Purchase Date" type="date" value={form.purchaseDate}
              onChange={(e) => handleField('purchaseDate', e.target.value)} />
          </div>
          <div className="mt-3">
            <Input label="Address" value={form.supplierAddress}
              onChange={(e) => handleField('supplierAddress', e.target.value)} placeholder="Supplier address (optional)" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Products Purchased</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead className="bg-gray-50">
                <tr>
                  {['Product', 'Qty', 'Cost per unit (₹)', 'Line Total', ''].map((h) => (
                    <th key={h} className="text-left px-2 py-2 text-gray-500 text-[10px] uppercase font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const prod = products.find((p) => p._id === item.productId);
                  const lineTotal = (Number(item.quantity) || 0) * (Number(item.price) || prod?.pricePerUnit || 0);
                  return (
                    <tr key={idx} className="border-b border-gray-100 align-top">
                      <td className="px-1 py-1">
                        <select value={item.productId} onChange={(e) => handleItem(idx, 'productId', e.target.value)} className={inp + ' min-w-[180px]'}>
                          <option value="">Select product</option>
                          {products.map((p) => <option key={p._id} value={p._id}>{p.name} (Stock: {p.stock})</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        <input type="number" min="1" value={item.quantity}
                          onChange={(e) => handleItem(idx, 'quantity', e.target.value)} className={inp + ' w-16 text-right'} />
                      </td>
                      <td className="px-1 py-1">
                        <input type="number" min="0" step="0.01"
                          value={item.price} placeholder={prod ? String(prod.pricePerUnit) : '0'}
                          onChange={(e) => handleItem(idx, 'price', e.target.value)} className={inp + ' w-24 text-right'} />
                      </td>
                      <td className="px-1 py-1 text-right text-xs font-semibold text-gray-700 w-20">
                        ₹{lineTotal.toFixed(2)}
                      </td>
                      <td className="px-1 py-1 text-center w-8">
                        <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-lg font-bold">×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addItem} className="mt-2 text-sm text-green-600 hover:text-green-800 font-medium">+ Add Product</button>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Payment to Supplier</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <Select label="Payment Mode" value={form.paymentMode} onChange={(e) => handleField('paymentMode', e.target.value)}>
              {['cash','upi','card','credit','bank_transfer'].map((m) => <option key={m} value={m}>{m.replace('_',' ').toUpperCase()}</option>)}
            </Select>
            <Input label="Amount Paid (₹)" type="number" min="0" value={form.paidAmount}
              onChange={(e) => handleField('paidAmount', e.target.value)} placeholder="Leave blank = full credit" />
            <Input label="Notes" value={form.notes} onChange={(e) => handleField('notes', e.target.value)} placeholder="Optional" />
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-400">Total</span>
              <div className="text-lg font-bold text-green-700 bg-green-50 rounded-lg px-3 py-2">
                ₹{totalAmount.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" loading={submitting}>📥 Record Purchase &amp; Update Stock</Button>
        </div>
      </form>
    </Modal>
  );
};

// ── Purchases Page ────────────────────────────────────────────────────────────
const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading]     = useState(false);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [formOpen, setFormOpen]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await purchaseService.getAll({ page, limit: 20, search: search || undefined });
      setPurchases(data.purchases);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load purchases'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const controller = new AbortController();
    load();
    return () => controller.abort();
  }, [page, search]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">📥 Purchases (Stock In)</h2>
          <Button onClick={() => setFormOpen(true)}>+ New Purchase</Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <Input placeholder="Search supplier name or purchase #..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                {['Purchase #','Supplier','Items','Total','Paid','Due','Payment','Date','By'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading…</td></tr>
              ) : purchases.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">No purchases yet</td></tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-semibold text-green-700">{p.purchaseNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.supplierName}</div>
                      {p.supplierPhone && <div className="text-xs text-gray-400">{p.supplierPhone}</div>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{p.items.length}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">₹{p.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-green-700">₹{p.paidAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {p.dueAmount > 0 ? `₹${p.dueAmount.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 capitalize text-xs">{p.paymentMode.replace('_',' ')}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(p.purchaseDate || p.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{p.createdBy?.name || '—'}</td>
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
      </div>

      <PurchaseForm isOpen={formOpen} onClose={() => setFormOpen(false)} onCreated={load} />
    </>
  );
};

export default Purchases;
