import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { createProduct, updateProduct } from '../../features/products/productSlice';
import Modal from '../ui/Modal';
import Input from './Input';
import Select from './Select';
import Textarea from './Textarea';
import Button from './Button';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['seed', 'fertilizer', 'pesticide', 'tool', 'other'];
const UNITS = ['kg', 'g', 'litre', 'ml', 'packet', 'bag', 'piece'];

const EMPTY_FORM = {
  name: '',
  category: '',
  brand: '',
  description: '',
  unit: '',
  pricePerUnit: '',
  stock: '',
  lowStockThreshold: '10',
};

// ─── Validation ───────────────────────────────────────────────────────────────
const validate = (form) => {
  const errs = {};
  if (!form.name.trim()) errs.name = 'Product name is required';
  if (!form.category) errs.category = 'Category is required';
  if (!form.unit) errs.unit = 'Unit is required';
  if (!form.pricePerUnit || isNaN(form.pricePerUnit) || Number(form.pricePerUnit) < 0)
    errs.pricePerUnit = 'Enter a valid price (≥ 0)';
  if (!form.stock || isNaN(form.stock) || Number(form.stock) < 0)
    errs.stock = 'Enter a valid stock quantity (≥ 0)';
  if (form.lowStockThreshold && (isNaN(form.lowStockThreshold) || Number(form.lowStockThreshold) < 0))
    errs.lowStockThreshold = 'Must be a non-negative number';
  return errs;
};

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * FILE: src/components/common/ProductForm.jsx
 *
 * Props:
 *   isOpen   {boolean}        — controls modal visibility
 *   onClose  {() => void}     — called on cancel / successful save
 *   product  {object | null}  — null = Add mode, object = Edit mode
 */
const ProductForm = ({ isOpen, onClose, product = null }) => {
  const dispatch = useDispatch();
  const isEdit = Boolean(product);

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Populate form when editing
  useEffect(() => {
    if (isOpen) {
      if (product) {
        setForm({
          name: product.name || '',
          category: product.category || '',
          brand: product.brand || '',
          description: product.description || '',
          unit: product.unit || '',
          pricePerUnit: String(product.pricePerUnit ?? ''),
          stock: String(product.stock ?? ''),
          lowStockThreshold: String(product.lowStockThreshold ?? '10'),
        });
        setImagePreview(product.imageUrl || null);
      } else {
        setForm(EMPTY_FORM);
        setImagePreview(null);
      }
      setErrors({});
      setImageFile(null);
    }
  }, [isOpen, product]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2 MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      // Build multipart FormData (backend expects multipart for image upload)
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append('image', imageFile);

      if (isEdit) {
        // Edit: send as plain JSON (no new image) or multipart if image changed
        const payload = imageFile ? fd : { ...form };
        const result = await dispatch(
          updateProduct({ id: product._id, data: payload })
        ).unwrap();
        toast.success(`"${result.product.name}" updated`);
      } else {
        const result = await dispatch(createProduct(fd)).unwrap();
        toast.success(`"${result.product.name}" added`);
      }
      onClose();
    } catch (err) {
      toast.error(err || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? '✏️ Edit Product' : '🌱 Add New Product'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>

        {/* Row 1 — Name + Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Product Name *"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. DAP Fertilizer"
            error={errors.name}
          />
          <Select
            label="Category *"
            name="category"
            value={form.category}
            onChange={handleChange}
            error={errors.category}
          >
            <option value="">Select category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </Select>
        </div>

        {/* Row 2 — Brand + Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Brand"
            name="brand"
            value={form.brand}
            onChange={handleChange}
            placeholder="e.g. IFFCO"
          />
          <Select
            label="Unit *"
            name="unit"
            value={form.unit}
            onChange={handleChange}
            error={errors.unit}
          >
            <option value="">Select unit</option>
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </Select>
        </div>

        {/* Row 3 — Price + Stock + Low Stock Threshold */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Price per Unit (₹) *"
            name="pricePerUnit"
            type="number"
            min="0"
            step="0.01"
            value={form.pricePerUnit}
            onChange={handleChange}
            placeholder="0.00"
            error={errors.pricePerUnit}
          />
          <Input
            label="Stock Quantity *"
            name="stock"
            type="number"
            min="0"
            value={form.stock}
            onChange={handleChange}
            placeholder="0"
            error={errors.stock}
          />
          <Input
            label="Low Stock Alert At"
            name="lowStockThreshold"
            type="number"
            min="0"
            value={form.lowStockThreshold}
            onChange={handleChange}
            placeholder="10"
            error={errors.lowStockThreshold}
          />
        </div>

        {/* Description */}
        <Textarea
          label="Description"
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Optional product description..."
        />

        {/* Image Upload */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Product Image</label>
          <div className="flex items-center gap-4">
            {imagePreview && (
              <img
                src={import.meta.env.VITE_BACKEND_URL+imagePreview}
                alt="Preview"
                className="w-16 h-16 rounded-lg object-cover border border-gray-200"
              />
            )}
            <label className="cursor-pointer border border-dashed border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-500 hover:border-green-400 hover:text-green-600 transition-colors">
              {imagePreview ? 'Change image' : 'Upload image (max 2 MB)'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImage}
              />
            </label>
            {imagePreview && (
              <button
                type="button"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="text-xs text-red-400 hover:text-red-600"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? 'Save Changes' : 'Add Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ProductForm;