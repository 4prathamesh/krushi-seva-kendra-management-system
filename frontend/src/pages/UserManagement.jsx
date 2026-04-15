import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Button from '../components/common/Button';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

// ─── Validation ───────────────────────────────────────────────────────────────
const validate = (form) => {
  const errs = {};
  if (!form.name.trim())   errs.name  = 'Name is required';
  if (!form.email.trim())  errs.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email';
  if (!form.password)      errs.password = 'Password is required';
  else if (form.password.length < 6) errs.password = 'Must be at least 6 characters';
  if (!form.role)          errs.role  = 'Role is required';
  return errs;
};

const EMPTY_FORM = { name: '', email: '', password: '', role: 'staff', phone: '' };

const ROLE_BADGE = {
  admin: 'bg-purple-100 text-purple-700',
  staff: 'bg-blue-100 text-blue-700',
};

// ─── Add User Form Modal ──────────────────────────────────────────────────────
const AddUserModal = ({ isOpen, onClose, onAdded }) => {
  const [form, setForm]         = useState(EMPTY_FORM);
  const [errors, setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  useEffect(() => {
    if (isOpen) { setForm(EMPTY_FORM); setErrors({}); }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const res = await api.post('/auth/register', form);
      toast.success(`User "${res.data.data.user.name}" created`);
      onAdded(res.data.data.user);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create user';
      if (msg.toLowerCase().includes('email')) {
        setErrors((prev) => ({ ...prev, email: msg }));
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="➕ Add New User" size="md">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Full Name *"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="e.g. Suresh Patil"
          error={errors.name}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Email *"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="user@ksk.com"
            error={errors.email}
          />
          <Input
            label="Phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            placeholder="9876543210"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <Input
              label="Password *"
              name="password"
              type={showPwd ? 'text' : 'password'}
              value={form.password}
              onChange={handleChange}
              placeholder="Min 6 characters"
              error={errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-8 text-xs text-gray-400 hover:text-gray-600"
            >
              {showPwd ? 'Hide' : 'Show'}
            </button>
          </div>
          <Select
            label="Role *"
            name="role"
            value={form.role}
            onChange={handleChange}
            error={errors.role}
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" loading={submitting}>Create User</Button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const UserManagement = () => {
  const { user: currentUser } = useSelector((s) => s.auth);
  const navigate = useNavigate();

  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModal] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data.data.users);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/auth/users');
        if (!cancelled) setUsers(res.data.data.users);
      } catch {
        if (!cancelled) toast.error('Failed to load users');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdded = (newUser) => {
    setUsers((prev) => [newUser, ...prev]);
  };

  const toggleActive = async (id, currentState) => {
    try {
      await api.put(`/auth/users/${id}`, { isActive: !currentState });
      setUsers((prev) =>
        prev.map((u) => u._id === id ? { ...u, isActive: !currentState } : u)
      );
      toast.success(`User ${currentState ? 'deactivated' : 'activated'}`);
    } catch {
      toast.error('Action not available — add PUT /auth/users/:id to backend first');
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">👥 User Management</h2>
        <Button onClick={() => setModal(true)}>+ Add User</Button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
        <strong>Admin only.</strong> Create staff or admin accounts here. Deactivated users cannot log in.
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              {['Name', 'Email', 'Role', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : users.map((u) => (
              <tr key={u._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  {u.name}
                  {u._id === currentUser?._id && (
                    <span className="ml-2 text-xs text-gray-400">(you)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${ROLE_BADGE[u.role] || 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {u.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u._id !== currentUser?._id && (
                    <Button
                      variant={u.isActive !== false ? 'danger' : 'outline'}
                      className="py-1 px-2 text-xs"
                      onClick={() => toggleActive(u._id, u.isActive !== false)}
                    >
                      {u.isActive !== false ? 'Deactivate' : 'Activate'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddUserModal isOpen={modalOpen} onClose={() => setModal(false)} onAdded={handleAdded} />
    </div>
  );
};

export default UserManagement;
