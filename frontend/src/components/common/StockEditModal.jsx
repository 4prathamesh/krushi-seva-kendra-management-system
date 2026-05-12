import { useState, useEffect } from 'react';
import { useUpdateStock } from '../../hooks/useProducts';
import Modal from '../ui/Modal';
import Input from './Input';
import Button from './Button';
import toast from 'react-hot-toast';

/**
 * FILE: src/components/common/StockEditModal.jsx
 *
 * Quick-edit modal for adjusting a single product's stock.
 * Calls PATCH /products/:id/stock via productService.updateStock()
 * then syncs state via updateProduct thunk.
 *
 * Props:
 *   isOpen   {boolean}
 *   onClose  {() => void}
 *   product  {object}  — the product whose stock to adjust
 */
const StockEditModal = ({ isOpen, onClose, product }) => {
  const updateStockMutation = useUpdateStock();

  const [newStock, setNewStock]     = useState('');
  const [error, setError]           = useState('');

  useEffect(() => {
    if (isOpen && product) {
      setNewStock(String(product.stock ?? 0));
      setError('');
    }
  }, [isOpen, product]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const val = Number(newStock);

    if (newStock === '' || isNaN(val) || val < 0) {
      setError('Enter a valid stock quantity (≥ 0)');
      return;
    }

    try {
      await updateStockMutation.mutateAsync({ id: product._id, stock: val });
      toast.success(`Stock updated to ${val} ${product.unit}`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update stock');
    }
  };

  if (!product) return null;

  const diff = Number(newStock) - (product.stock ?? 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📦 Adjust Stock" size="sm">
      {/* Product summary */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm space-y-1">
        <p className="font-semibold text-gray-800">{product.name}</p>
        <p className="text-gray-500">
          Current stock: <span className="font-medium text-gray-700">{product.stock} {product.unit}</span>
        </p>
        <p className="text-gray-500">
          Low stock alert at:{' '}
          <span className="font-medium text-gray-700">{product.lowStockThreshold} {product.unit}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label={`New Stock (${product.unit})`}
          type="number"
          min="0"
          value={newStock}
          onChange={(e) => {
            setNewStock(e.target.value);
            setError('');
          }}
          error={error}
          autoFocus
        />

        {/* Live diff indicator */}
        {newStock !== '' && !isNaN(Number(newStock)) && (
          <p className={`text-xs font-medium ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {diff > 0 ? `▲ Adding ${diff} ${product.unit}` :
             diff < 0 ? `▼ Removing ${Math.abs(diff)} ${product.unit}` :
             'No change'}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={updateStockMutation.isPending}>Cancel</Button>
          <Button type="submit" loading={updateStockMutation.isPending}>Update Stock</Button>
        </div>
      </form>
    </Modal>
  );
};

export default StockEditModal;
