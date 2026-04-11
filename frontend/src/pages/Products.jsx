import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts, deleteProduct } from '../features/products/productSlice';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import ProductForm from '../components/common/ProductForm';
import StockEditModal from '../components/common/StockEditModal';
import toast from 'react-hot-toast';

const CATEGORIES = ['seed', 'fertilizer', 'pesticide', 'tool', 'other'];
const STOCK_BADGES = {
  in_stock:     'bg-green-100 text-green-700',
  low_stock:    'bg-yellow-100 text-yellow-700',
  out_of_stock: 'bg-red-100 text-red-700',
};

const BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';

const Products = () => {
  const dispatch = useDispatch();
  const { items: products, loading, pagination } = useSelector((s) => s.products);
  const { user } = useSelector((s) => s.auth);

  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [page, setPage]         = useState(1);

  // ── Add / Edit modal ──
  const [formOpen, setFormOpen]      = useState(false);
  const [editingProduct, setEditing] = useState(null);

  // ── Stock edit modal ──
  const [stockOpen, setStockOpen]   = useState(false);
  const [stockProduct, setStockProd] = useState(null);

  useEffect(() => {
    dispatch(fetchProducts({ search, category, stockStatus: stockFilter, page, limit: 10 }));
  }, [dispatch, search, category, stockFilter, page]);

  const openAdd       = () => { setEditing(null); setFormOpen(true); };
  const openEdit      = (p) => { setEditing(p);   setFormOpen(true); };
  const closeForm     = () => { setFormOpen(false); setEditing(null); };
  const openStock     = (p) => { setStockProd(p); setStockOpen(true); };
  const closeStock    = () => { setStockOpen(false); setStockProd(null); };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await dispatch(deleteProduct(id)).unwrap();
      toast.success('Product deleted');
    } catch (err) {
      toast.error(err || 'Failed to delete product');
    }
  };

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">🌱 Products</h2>
        {user?.role === 'admin' && (
          <Button onClick={openAdd}>+ Add Product</Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-48"
        />
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
        {/* Stock status filter pills */}
        <div className="flex gap-1">
          {[['', 'All'], ['in_stock', '✅ In Stock'], ['low_stock', '⚠️ Low'], ['out_of_stock', '❌ Out']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => { setStockFilter(val); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                stockFilter === val
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              {['', 'Name', 'Category', 'Brand', 'Price', 'Stock', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">No products found</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50">
                  {/* Image thumbnail */}
                  <td className="px-3 py-2 w-12">
                    {p.imageUrl ? (
                      <img
                        src={`${BASE_URL}${p.imageUrl}`}
                        alt={p.name}
                        className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg">
                        🌱
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 capitalize">{p.category}</td>
                  <td className="px-4 py-3 text-gray-500">{p.brand || '—'}</td>
                  <td className="px-4 py-3">₹{p.pricePerUnit}/{p.unit}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openStock(p)}
                      className="font-medium hover:text-green-700 hover:underline transition-colors"
                      title="Click to adjust stock"
                    >
                      {p.stock} {p.unit}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STOCK_BADGES[p.stockStatus]}`}>
                      {p.stockStatus.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="outline" className="py-1 px-2 text-xs" onClick={() => openEdit(p)}>Edit</Button>
                      <Button variant="secondary" className="py-1 px-2 text-xs" onClick={() => openStock(p)}>Stock</Button>
                      {user?.role === 'admin' && (
                        <Button variant="danger" className="py-1 px-2 text-xs" onClick={() => handleDelete(p._id, p.name)}>
                          Delete
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

      {/* Add / Edit Product Modal */}
      <ProductForm isOpen={formOpen} onClose={closeForm} product={editingProduct} />

      {/* Stock Quick-Edit Modal */}
      <StockEditModal isOpen={stockOpen} onClose={closeStock} product={stockProduct} />
    </div>
  );
};

export default Products;
