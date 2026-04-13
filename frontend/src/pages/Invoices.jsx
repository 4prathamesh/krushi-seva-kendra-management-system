import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchInvoices, cancelInvoice } from '../features/invoices/invoiceSlice';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import InvoicePrint from '../components/common/InvoicePrint';
import invoiceService from '../services/invoice.service';
import toast from 'react-hot-toast';

const PAY_BADGE = {
  cash: 'bg-green-100 text-green-700',
  upi:  'bg-blue-100 text-blue-700',
  card: 'bg-purple-100 text-purple-700',
};

const Invoices = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items: invoices, loading, pagination } = useSelector((s) => s.invoices);
  const { user } = useSelector((s) => s.auth );

  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [payFilter, setPay]   = useState('');
  const [fromDate, setFrom]   = useState('');
  const [toDate, setTo]       = useState('');

  // Print overlay
  const [printInvoice, setPrintInv] = useState(null);
  const [loadingPrint, setLoadPrint] = useState(false);

  useEffect(() => {
    dispatch(fetchInvoices({
      page,
      limit: 20,
      search:      search      || undefined,
      paymentMode: payFilter   || undefined,
      from:        fromDate    || undefined,
      to:          toDate      || undefined,
    }));
  }, [dispatch, page, search, payFilter, fromDate, toDate]);

  const handleReprint = async (id) => {
    setLoadPrint(true);
    try {
      const data = await invoiceService.getById(id);
      setPrintInv(data.invoice);
    } catch {
      toast.error('Failed to load invoice');
    } finally {
      setLoadPrint(false);
    }
  };

  const handleCancel = async (id, invoiceNumber) => {
    if (!window.confirm(`Cancel invoice ${invoiceNumber}? Stock will be restored.`)) return;
    try {
      await dispatch(cancelInvoice({ id, reason: 'Cancelled by admin' })).unwrap();
      toast.success(`Invoice ${invoiceNumber} cancelled — stock restored`);
      dispatch(fetchInvoices({
        page,
        limit: 20,
        search:      search      || undefined,
        paymentMode: payFilter   || undefined,
        from:        fromDate    || undefined,
        to:          toDate      || undefined,
      }));
    } catch (err) {
      toast.error(err || 'Failed to cancel invoice');
    }
  };

  const resetFilters = () => {
    setSearch(''); setPay(''); setFrom(''); setTo(''); setPage(1);
  };

  return (
    <>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">🧾 Invoices</h2>
          <Button onClick={() => navigate('/billing')}>
            + New Invoice
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="sm:col-span-2">
              <Input
                placeholder="Search name, mobile, invoice #..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select
              value={payFilter}
              onChange={(e) => { setPay(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Payment Modes</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
            </select>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }}
              label=""
              placeholder="From date"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => { setTo(e.target.value); setPage(1); }}
              label=""
              placeholder="To date"
            />
          </div>
          {(search || payFilter || fromDate || toDate) && (
            <button
              onClick={resetFilters}
              className="mt-2 text-xs text-red-400 hover:text-red-600 font-medium"
            >
              ✕ Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                {['Invoice #', 'Customer', 'Mobile', 'Items', 'Taxable', 'CGST', 'SGST', 'Grand Total', 'Payment', 'Date', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={11} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-10 text-gray-400">No invoices found</td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-green-700">{inv.invoiceNumber}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{inv.customerName}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.mobile}</td>
                    <td className="px-4 py-3 text-gray-500 text-center">{inv.items.length}</td>
                    <td className="px-4 py-3 text-right">₹{Number(inv.subTotal).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">₹{Number(inv.cgstTotal).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">₹{Number(inv.sgstTotal).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-700">
                      ₹{Number(inv.grandTotal).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${PAY_BADGE[inv.paymentMode] || 'bg-gray-100 text-gray-600'}`}>
                        {inv.paymentMode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(inv.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          className="py-1 px-2 text-xs"
                          onClick={() => handleReprint(inv._id)}
                          loading={loadingPrint}
                        >
                          🖨️ Print
                        </Button>
                        {user?.role === 'admin' && (
                          <Button
                            variant="danger"
                            className="py-1 px-2 text-xs"
                            onClick={() => handleCancel(inv._id, inv.invoiceNumber)}
                          >
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

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-end items-center gap-2 px-4 py-3 border-t text-sm">
              <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="py-1 px-3">←</Button>
              <span className="text-gray-600">Page {page} of {pagination.pages}</span>
              <Button variant="secondary" disabled={page === pagination.pages} onClick={() => setPage((p) => p + 1)} className="py-1 px-3">→</Button>
            </div>
          )}
        </div>
      </div>

      {/* Re-print overlay */}
      {printInvoice && (
        <InvoicePrint invoice={printInvoice} onClose={() => setPrintInv(null)} />
      )}
    </>
  );
};

export default Invoices;
