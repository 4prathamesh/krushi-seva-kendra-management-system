import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from './Button';
import customerService from '../../services/customer.service';
import invoiceService from '../../services/invoice.service';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  paid:      'bg-green-100 text-green-800',
  partial:   'bg-yellow-100 text-yellow-800',
  credit:    'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};
const STATUS_LABEL = { paid:'Paid', partial:'Partial', credit:'Udhar', cancelled:'Cancelled' };
const PAY_BADGE    = { cash:'bg-green-100 text-green-700', upi:'bg-blue-100 text-blue-700', card:'bg-purple-100 text-purple-700', none:'bg-gray-100 text-gray-500' };

// ── Credit Payment Sub-panel ──────────────────────────────────────────────────
const RecordPaymentPanel = ({ customer, onPaid }) => {
  const [amount, setAmount] = useState('');
  const [note, setNote]     = useState('');
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    if (amt > customer.creditBalance) {
      toast.error(`Amount exceeds outstanding credit (₹${customer.creditBalance.toFixed(2)})`);
      return;
    }
    setLoading(true);
    try {
      const result = await invoiceService.recordCreditPayment({
        customerId: customer._id,
        amount: amt,
        note: note.trim() || 'Credit payment received',
      });
      toast.success(`₹${result.applied.toFixed(2)} received. Remaining credit: ₹${result.remainingCredit.toFixed(2)}`);
      setAmount('');
      setNote('');
      onPaid();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-red-700">📒 Outstanding Credit (Udhar)</p>
          <p className="text-2xl font-bold text-red-700 mt-0.5">
            ₹{(customer.creditBalance || 0).toFixed(2)}
          </p>
        </div>
        <div className="text-right text-xs text-red-500">
          <div>Customer owes this amount</div>
          <div>Record payment below</div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="number" min="1" step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount received (₹)"
          className="border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
        />
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
        />
        <Button
          onClick={handlePay}
          loading={loading}
          className="bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-sm font-semibold"
        >
          ✓ Record Payment
        </Button>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const CustomerOrderHistory = ({ isOpen, onClose, customer: customerProp, onPaymentRecorded }) => {
  const [invoices, setInvoices]     = useState([]);
  const [customer, setCustomer]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [showLedger, setShowLedger] = useState(false);
  const [ledger, setLedger]         = useState(null);

  const load = async () => {
    if (!customerProp?._id) return;
    setLoading(true);
    setError('');
    try {
      const [invoiceData, customerData] = await Promise.all([
        customerService.getInvoices(customerProp._id),
        customerService.getById(customerProp._id),  // fresh fetch to get updated creditBalance
      ]);
      setInvoices(invoiceData.invoices || []);
      setCustomer(customerData.customer || customerProp);
    } catch {
      setError('Failed to load invoice history');
      setCustomer(customerProp);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerProp?._id) load();
    else { setInvoices([]); setCustomer(null); setLedger(null); }
  }, [isOpen, customerProp?._id]);

  const loadLedger = async () => {
    try {
      const data = await invoiceService.getCreditLedger(customerProp._id);
      setLedger(data);
      setShowLedger(true);
    } catch { toast.error('Failed to load credit ledger'); }
  };

  const cust = customer || customerProp;
  const totalSpent = invoices.filter((i) => !i.isCancelled).reduce((s, i) => s + (i.grandTotal || 0), 0);
  const totalDue   = invoices.filter((i) => !i.isCancelled).reduce((s, i) => s + (i.dueAmount || 0), 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`📋 ${cust?.name || ''} — Invoice History`} size="lg">
      {loading && <div className="flex items-center justify-center py-16 text-gray-400">Loading…</div>}
      {error   && <div className="text-center py-10 text-red-500">{error}</div>}

      {!loading && !error && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl p-3 text-center bg-blue-50">
              <p className="text-xl font-bold text-blue-700">{invoices.length}</p>
              <p className="text-xs font-medium mt-0.5 text-blue-600">Total Invoices</p>
            </div>
            <div className="rounded-xl p-3 text-center bg-green-50">
              <p className="text-xl font-bold text-green-700">₹{totalSpent.toLocaleString('en-IN')}</p>
              <p className="text-xs font-medium mt-0.5 text-green-600">Total Billed</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${(cust?.creditBalance || 0) > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
              <p className={`text-xl font-bold ${(cust?.creditBalance || 0) > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                ₹{(cust?.creditBalance || 0).toFixed(2)}
              </p>
              <p className={`text-xs font-medium mt-0.5 ${(cust?.creditBalance || 0) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                Outstanding Credit
              </p>
            </div>
          </div>

          {/* Credit payment panel — only when there's outstanding balance */}
          {(cust?.creditBalance || 0) > 0 && (
            <div className="mb-4">
              <RecordPaymentPanel customer={cust} onPaid={() => { load(); if (onPaymentRecorded) onPaymentRecorded(); }} />
              <button
                onClick={showLedger ? () => setShowLedger(false) : loadLedger}
                className="mt-2 text-xs text-blue-500 hover:text-blue-700 font-medium"
              >
                {showLedger ? '▲ Hide credit ledger' : '▼ View full credit ledger'}
              </button>
            </div>
          )}

          {/* Credit ledger */}
          {showLedger && ledger && (
            <div className="mb-4 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Credit Ledger</p>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {ledger.transactions.length === 0 ? (
                  <p className="text-center py-4 text-xs text-gray-400">No transactions</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {['Date','Type','Amount','Note'].map((h) => (
                          <th key={h} className="text-left px-3 py-2 text-gray-500 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ledger.transactions.map((t) => (
                        <tr key={t._id}>
                          <td className="px-3 py-2 text-gray-500">
                            {new Date(t.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.type === 'charge' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {t.type === 'charge' ? '+ Charged' : '✓ Paid'}
                            </span>
                          </td>
                          <td className={`px-3 py-2 font-semibold ${t.type === 'charge' ? 'text-red-600' : 'text-green-600'}`}>
                            {t.type === 'charge' ? '+' : '−'} ₹{Number(t.amount).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-gray-400 truncate max-w-[120px]">{t.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Invoice list */}
          {invoices.length === 0 ? (
            <div className="text-center py-10 text-gray-400">No invoices found</div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {invoices.map((inv) => (
                <div key={inv._id}
                  className={`border rounded-xl p-4 ${inv.isCancelled ? 'border-red-100 bg-red-50/30 opacity-70' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-mono font-semibold text-green-700 text-sm">{inv.invoiceNumber}</span>
                      <span className="text-gray-400 text-xs ml-2">
                        {new Date(inv.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                      </span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[inv.paymentStatus || inv.status] || 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABEL[inv.paymentStatus || inv.status] || inv.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${PAY_BADGE[inv.paymentMode] || 'bg-gray-100 text-gray-500'}`}>
                        {inv.paymentMode === 'none' ? 'Udhar' : inv.paymentMode}
                      </span>
                    </div>
                  </div>

                  {/* Line items */}
                  <div className="space-y-0.5 mb-2">
                    {inv.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-600">
                        <span>{item.productName} × {item.quantity}</span>
                        <span>₹{Number(item.total).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Totals footer */}
                  <div className="border-t border-gray-100 pt-2 mt-1 space-y-0.5">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>CGST ₹{Number(inv.cgstTotal).toFixed(2)} · SGST ₹{Number(inv.sgstTotal).toFixed(2)}</span>
                      <span className="font-bold text-sm text-gray-800">
                        Grand Total: ₹{Number(inv.grandTotal).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {(inv.dueAmount > 0) && (
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-green-600">Paid: ₹{Number(inv.paidAmount).toFixed(2)}</span>
                        <span className="text-red-600">Due (Udhar): ₹{Number(inv.dueAmount).toFixed(2)}</span>
                      </div>
                    )}
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
