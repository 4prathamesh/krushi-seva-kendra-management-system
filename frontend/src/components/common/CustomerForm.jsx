import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { createCustomer, updateCustomer } from '../../features/customers/customerSlice';
import Modal from '../ui/Modal';
import Input from './Input';
import Textarea from './Textarea';
import Button from './Button';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const CROP_OPTIONS = [
  'wheat', 'cotton', 'sugarcane', 'rice', 'jowar', 'bajra',
  'maize', 'soybean', 'tur', 'gram', 'onion', 'tomato', 'grapes',
];

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  village: '',
  taluka: '',
  district: '',
  landAcres: '',
  outstandingBalance: '',
  notes: '',
};

// ─── Validation ───────────────────────────────────────────────────────────────
const validate = (form, selectedCrops) => {
  const errs = {};
  if (!form.name.trim()) errs.name = 'Customer name is required';
  if (!form.phone.trim()) {
    errs.phone = 'Phone number is required';
  } else if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
    errs.phone = 'Enter a valid 10-digit Indian mobile number';
  }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errs.email = 'Enter a valid email address';
  if (form.landAcres && (isNaN(form.landAcres) || Number(form.landAcres) < 0))
    errs.landAcres = 'Land area must be a positive number';
  return errs;
};

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * FILE: src/components/common/CustomerForm.jsx
 *
 * Props:
 *   isOpen      {boolean}
 *   onClose     {() => void}
 *   customer    {object | null}  — null = Add, object = Edit
 *   onSaved     {(customer) => void}  — called after successful save
 */
const CustomerForm = ({ isOpen, onClose, customer = null, onSaved }) => {
  const dispatch = useDispatch();
  const isEdit = Boolean(customer);

  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedCrops, setSelectedCrops] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (isOpen) {
      if (customer) {
        setForm({
          name: customer.name || '',
          phone: customer.phone || '',
          email: customer.email || '',
          village: customer.village || '',
          taluka: customer.taluka || '',
          district: customer.district || '',
          landAcres: String(customer.landAcres ?? ''),
          outstandingBalance: String(customer.outstandingBalance ?? ''),
          notes: customer.notes || '',
        });
        setSelectedCrops(customer.cropTypes || []);
      } else {
        setForm(EMPTY_FORM);
        setSelectedCrops([]);
      }
      setErrors({});
    }
  }, [isOpen, customer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const toggleCrop = (crop) => {
    setSelectedCrops((prev) =>
      prev.includes(crop) ? prev.filter((c) => c !== crop) : [...prev, crop]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form, selectedCrops);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        landAcres: form.landAcres ? Number(form.landAcres) : undefined,
        outstandingBalance: form.outstandingBalance !== '' ? Number(form.outstandingBalance) : undefined,
        cropTypes: selectedCrops,
      };

      let saved;
      if (isEdit) {
        const result = await dispatch(updateCustomer({ id: customer._id, data: payload })).unwrap();
        saved = result.customer;
        toast.success(`"${saved.name}" updated`);
      } else {
        const result = await dispatch(createCustomer(payload)).unwrap();
        saved = result.customer;
        toast.success(`"${saved.name}" added`);
      }
      onSaved?.(saved);
      onClose();
    } catch (err) {
      const msg = typeof err === 'string' ? err : err?.message || 'Something went wrong';
      if (msg.toLowerCase().includes('phone')) {
        setErrors((prev) => ({ ...prev, phone: msg }));
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? '✏️ Edit Customer' : '👨‍🌾 Add New Customer'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>

        {/* Row 1 — Name + Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name *"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Ramesh Patil"
            error={errors.name}
          />
          <Input
            label="Mobile Number *"
            name="phone"
            type="tel"
            maxLength={10}
            value={form.phone}
            onChange={handleChange}
            placeholder="9823456789"
            error={errors.phone}
          />
        </div>

        {/* Row 2 — Email + Land + Outstanding Balance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="ramesh@example.com"
            error={errors.email}
          />
          <Input
            label="Land (acres)"
            name="landAcres"
            type="number"
            min="0"
            step="0.1"
            value={form.landAcres}
            onChange={handleChange}
            placeholder="e.g. 5.5"
            error={errors.landAcres}
          />
          <Input
            label="Outstanding Balance (₹)"
            name="outstandingBalance"
            type="number"
            min="0"
            step="0.01"
            value={form.outstandingBalance}
            onChange={handleChange}
            placeholder="0"
          />
        </div>

        {/* Row 3 — Village + Taluka + District */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Village"
            name="village"
            value={form.village}
            onChange={handleChange}
            placeholder="e.g. Shirdi"
          />
          <Input
            label="Taluka"
            name="taluka"
            value={form.taluka}
            onChange={handleChange}
            placeholder="e.g. Rahata"
          />
          <Input
            label="District"
            name="district"
            value={form.district}
            onChange={handleChange}
            placeholder="e.g. Ahmednagar"
          />
        </div>

        {/* Crop Types */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Crops Grown</label>
          <div className="flex flex-wrap gap-2">
            {CROP_OPTIONS.map((crop) => (
              <button
                key={crop}
                type="button"
                onClick={() => toggleCrop(crop)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${
                  selectedCrops.includes(crop)
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                }`}
              >
                {crop}
              </button>
            ))}
          </div>
          {selectedCrops.length > 0 && (
            <p className="text-xs text-gray-400">
              Selected: {selectedCrops.join(', ')}
            </p>
          )}
        </div>

        {/* Notes */}
        <Textarea
          label="Notes"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Optional notes about this customer..."
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? 'Save Changes' : 'Add Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerForm;
