import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
// Dashboard stats now come from invoices (Order module removed)
import { fetchDashboardStats } from '../features/invoices/invoiceSlice';
import { fetchProducts } from '../features/products/productSlice';
import Card from '../components/ui/Card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const Dashboard = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();

  // Dashboard stats live in invoices slice now
  const { dashboard } = useSelector((s) => s.invoices);
  const { items: products } = useSelector((s) => s.products);

  useEffect(() => {
    dispatch(fetchDashboardStats());
    dispatch(fetchProducts({ limit: 100 }));
  }, [dispatch]);

  const categoryData = ['seed', 'fertilizer', 'pesticide', 'tool', 'other'].map((cat) => ({
    name:  cat.charAt(0).toUpperCase() + cat.slice(1),
    count: products.filter((p) => p.category === cat).length,
  }));

  const lowStockProducts = products.filter((p) => p.stockStatus !== 'in_stock');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">📊 Dashboard</h2>
        <button
          onClick={() => navigate('/billing')}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          🧾 New Invoice
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card
          icon="🧾"
          title="Total Invoices"
          value={dashboard?.totalInvoices ?? '—'}
          color="blue"
        />
        <Card
          icon="🛒"
          title="Today's Invoices"
          value={dashboard?.todayInvoices ?? '—'}
          color="green"
        />
        <Card
          icon="💰"
          title="Total Revenue"
          value={
            dashboard
              ? `₹${Number(dashboard.totalRevenue).toLocaleString('en-IN')}`
              : '—'
          }
          color="yellow"
        />
        <Card
          icon="👨‍🌾"
          title="Customers"
          value={dashboard?.totalCustomers ?? '—'}
          color="green"
        />
        <Card
          icon="⚠️"
          title="Low Stock"
          value={dashboard?.lowStockCount ?? lowStockProducts.length}
          color="red"
          subtitle="products need restock"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products by Category */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-base font-semibold text-gray-700 mb-4">
            Products by Category
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-700">
              ⚠️ Low / Out of Stock
            </h3>
            {lowStockProducts.length > 0 && (
              <button
                onClick={() => navigate('/products')}
                className="text-xs text-green-600 hover:text-green-800 font-medium"
              >
                Manage →
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {lowStockProducts.map((p) => (
              <div
                key={p._id}
                className="flex justify-between items-center text-sm px-3 py-2 rounded-lg bg-red-50"
              >
                <span className="font-medium text-gray-700">{p.name}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    p.stockStatus === 'out_of_stock'
                      ? 'bg-red-200 text-red-700'
                      : 'bg-yellow-200 text-yellow-700'
                  }`}
                >
                  {p.stock} {p.unit} — {p.stockStatus.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
            {lowStockProducts.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                ✅ All products well stocked
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '🧾 Invoices',   path: '/invoices'  },
          { label: '🌱 Products',   path: '/products'  },
          { label: '👨‍🌾 Customers', path: '/customers' },
          { label: '👤 Profile',    path: '/profile'   },
        ].map(({ label, path }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="bg-white rounded-xl shadow-sm px-4 py-3 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors text-left"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
