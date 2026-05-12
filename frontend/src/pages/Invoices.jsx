import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useInvoices, useCancelInvoice, useInvoice } from '../hooks/useInvoices';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import InvoicePrint from '../components/common/InvoicePrint';
import toast from 'react-hot-toast';

// Payment mode badges
const PAY_BADGE = {
  cash:  'bg-green-100 text-green-800',
  upi:   'bg-blue-100 text-blue-800',
  card:  'bg-purple-100 text-purple-800',
  mixed: 'bg-teal-100 text-teal-800',
  none:  'bg-gray-100 text-gray-600',
};

// Status badges — covers both invoice.status and invoice.paymentStatus
const STATUS_BADGE = {
  paid:      'bg-green-100 text-green-800',
  partial:   'bg-yellow-100 text-yellow-800',
  credit:    'bg-red-100 text-red-700',
  draft:     'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-200 text-red-800',
};

const STATUS_LABEL = {
  paid:      'Paid',
  partial:   'Partial',
  credit:    'Udhar',
  draft:     'Draft',
  cancelled: 'Cancelled',
};

const Invoices = () => {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const [page, setPage]                   = useState(1);
  const [search, setSearch]               = useState('');
  const [payModeFilter, setPayMode]       = useState('');
  const [payStatusFilter, setPayStatus]   = useState('');
  const [fromDate, setFrom]               = useState('');
  const [toDate, setTo]                   = useState('');

  // For reprint — store the invoice id to fetch, null = no print
  const [printId, setPrintId]           = useState(null);

  // ── React Query ────────────────────────────────────────────────────────────
  const { data, isLoading } = useInvoices({
    page, limit: 20,
    search:        search          || undefined,
    paymentMode:   payModeFilter   || undefined,
    paymentStatus: payStatusFilter || undefined,
    from:          fromDate        || undefined,
    to:            toDate          || undefined,
  });
  const invoices  = data?.invoices  || [];
  const pagination = data?.pagination || {};

  // Fetch single invoice for reprint (cached after first load)
  const { data: printData, isLoading: loadingPrint } = useInvoice(printId);
  const printInvoice = printData?.invoice || null;

  const cancelMutation = useCancelInvoice();

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleReprint = (id) => setPrintId(id);

  const handleCancel = async (id, invoiceNumber) => {
    if (!window.confirm(`Cancel invoice ${invoiceNumber}? Stock will be restored and any credit will be reversed.`)) return;
    try {
      await cancelMutation.mutateAsync({ id, reason: 'Cancelled by admin' });
      toast.success(`Invoice ${invoiceNumber} cancelled`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to cancel invoice');
    }
  };

  const resetFilters = () => {
    setSearch(''); setPayMode(''); setPayStatus(''); setFrom(''); setTo(''); setPage(1);
  };

  const hasFilter = search || payModeFilter || payStatusFilter || fromDate || toDate;

  return (
    <>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">🧾 Invoices</h2>
          <Button onClick={() => navigate('/billing')}>+ New Invoice</Button>
        </div>

        {/* Filter panel */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          {/* Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <Input
                placeholder="Search name, mobile, invoice #..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select
              value={payModeFilter}
              onChange={(e) => { setPayMode(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Payment Modes</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="none">None (Udhar)</option>
            </select>
            <select
              value={payStatusFilter}
              onChange={(e) => { setPayStatus(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Statuses</option>
              <option value="paid">Paid (Full)</option>
              <option value="partial">Partial Payment</option>
              <option value="credit">Udhar (Credit)</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {/* Row 2 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input type="date" value={fromDate} label=""
              onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            <Input type="date" value={toDate} label=""
              onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            <div className="sm:col-span-2 flex items-end">
              {hasFilter && (
                <button onClick={resetFilters} className="text-xs text-red-400 hover:text-red-600 font-medium">
                  ✕ Clear all filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                {['Invoice #','Customer','Mobile','Items','Grand Total','Paid','Due','Mode','Status','Date','Actions'].map((h) => (
                  <th key={h} className="text-left px-3 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={11} className="text-center py-10 text-gray-400">Loading…</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-10 text-gray-400">No invoices found</td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv._id} className={`hover:bg-gray-50 ${inv.isCancelled ? 'opacity-60' : ''}`}>
                    <td className="px-3 py-3">
                      <span className="font-mono font-semibold text-green-700 text-xs">{inv.invoiceNumber}</span>
                    </td>
                    <td className="px-3 py-3 font-medium max-w-[120px] truncate">{inv.customerName}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{inv.mobile}</td>
                    <td className="px-3 py-3 text-center text-gray-500">{inv.items.length}</td>
                    <td className="px-3 py-3 text-right font-bold text-gray-800">
                      ₹{Number(inv.grandTotal).toLocaleString('en-IN')}
                    </td>
                    {/* Paid */}
                    <td className="px-3 py-3 text-right text-green-700 font-medium text-xs">
                      ₹{Number(inv.paidAmount ?? inv.grandTotal).toFixed(2)}
                    </td>
                    {/* Due / Udhar */}
                    <td className="px-3 py-3 text-right text-xs">
                      {(inv.dueAmount > 0) ? (
                        <span className="font-semibold text-red-600">₹{Number(inv.dueAmount).toFixed(2)}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    {/* Payment mode */}
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${PAY_BADGE[inv.paymentMode] || 'bg-gray-100 text-gray-600'}`}>
                        {inv.paymentMode === 'none' ? 'Udhar' : inv.paymentMode}
                      </span>
                    </td>
                    {/* Payment status */}
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[inv.paymentStatus || inv.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[inv.paymentStatus || inv.status] || inv.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(inv.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1.5">
                        <Button variant="outline" className="py-1 px-2 text-xs"
                          onClick={() => handleReprint(inv._id)}
                          loading={loadingPrint} disabled={inv.isCancelled || loadingPrint}>
                          🖨️
                        </Button>
                        {user?.role === 'admin' && !inv.isCancelled && (
                          <Button variant="danger" className="py-1 px-2 text-xs"
                            onClick={() => handleCancel(inv._id, inv.invoiceNumber)}>
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
      </div>

      {printInvoice && <InvoicePrint invoice={printInvoice} onClose={() => setPrintInv(null)} />}
    </>
  );
};

export default Invoices;
