import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardStats } from '../features/orders/orderSlice';
import { fetchProducts } from '../features/products/productSlice';
import Card from '../components/ui/Card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { dashboard } = useSelector((state) => state.orders);
  const { items: products } = useSelector((state) => state.products);

  useEffect(() => {
    dispatch(fetchDashboardStats());
    dispatch(fetchProducts({ limit: 100 }));
  }, [dispatch]);

  const categoryData = ['seed', 'fertilizer', 'pesticide', 'tool', 'other'].map((cat) => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    count: products.filter((p) => p.category === cat).length,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon="📦" title="Total Orders" value={dashboard?.totalOrders ?? '—'} color="blue" />
        <Card icon="🛒" title="Today's Orders" value={dashboard?.todayOrders ?? '—'} color="green" />
        <Card icon="💰" title="Total Revenue" value={dashboard ? `₹${dashboard.totalRevenue.toLocaleString('en-IN')}` : '—'} color="yellow" />
        <Card icon="⏳" title="Pending Orders" value={dashboard?.pendingOrders ?? '—'} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products by Category */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-base font-semibold text-gray-700 mb-4">Products by Category</h3>
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
          <h3 className="text-base font-semibold text-gray-700 mb-4">⚠️ Low / Out of Stock</h3>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {products
              .filter((p) => p.stockStatus !== 'in_stock')
              .map((p) => (
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
                    {p.stock} {p.unit} — {p.stockStatus.replace('_', ' ')}
                  </span>
                </div>
              ))}
            {products.filter((p) => p.stockStatus !== 'in_stock').length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">✅ All products well stocked</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
