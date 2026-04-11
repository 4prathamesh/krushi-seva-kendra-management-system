import { useState } from 'react';
import { useSelector } from 'react-redux';
import authService from '../services/auth.service';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

// ─── Validation ───────────────────────────────────────────────────────────────
const validate = (form) => {
  const errs = {};
  if (!form.currentPassword) errs.currentPassword = 'Current password is required';
  if (!form.newPassword) {
    errs.newPassword = 'New password is required';
  } else if (form.newPassword.length < 6) {
    errs.newPassword = 'Must be at least 6 characters';
  }
  if (!form.confirmPassword) {
    errs.confirmPassword = 'Please confirm your new password';
  } else if (form.newPassword !== form.confirmPassword) {
    errs.confirmPassword = 'Passwords do not match';
  }
  return errs;
};

// ─── Role badge colours ───────────────────────────────────────────────────────
const ROLE_STYLE = {
  admin: 'bg-purple-100 text-purple-700',
  staff: 'bg-blue-100 text-blue-700',
};

// ─── Component ────────────────────────────────────────────────────────────────
const Profile = () => {
  const { user } = useSelector((s) => s.auth);

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

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
      await authService.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password changed successfully');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setErrors({});
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password';
      if (msg.toLowerCase().includes('current') || msg.toLowerCase().includes('incorrect')) {
        setErrors((prev) => ({ ...prev, currentPassword: msg }));
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800">👤 My Profile</h2>

      {/* Profile card */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl">
            🌾
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{user?.name}</h3>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${ROLE_STYLE[user?.role] || 'bg-gray-100 text-gray-600'}`}>
              {user?.role}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-t border-gray-100 pt-4">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Full Name</p>
            <p className="font-medium text-gray-800">{user?.name || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Email</p>
            <p className="font-medium text-gray-800">{user?.email || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Role</p>
            <p className="font-medium text-gray-800 capitalize">{user?.role || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">User ID</p>
            <p className="font-mono text-xs text-gray-400 break-all">{user?._id || '—'}</p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-gray-800">🔒 Change Password</h3>
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 font-medium"
          >
            {showPwd ? 'Hide' : 'Show'} passwords
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Current Password *"
            name="currentPassword"
            type={showPwd ? 'text' : 'password'}
            value={form.currentPassword}
            onChange={handleChange}
            placeholder="Enter current password"
            error={errors.currentPassword}
            autoComplete="current-password"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="New Password *"
              name="newPassword"
              type={showPwd ? 'text' : 'password'}
              value={form.newPassword}
              onChange={handleChange}
              placeholder="Min 6 characters"
              error={errors.newPassword}
              autoComplete="new-password"
            />
            <Input
              label="Confirm New Password *"
              name="confirmPassword"
              type={showPwd ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat new password"
              error={errors.confirmPassword}
              autoComplete="new-password"
            />
          </div>

          {/* Password strength indicator */}
          {form.newPassword && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[
                  form.newPassword.length >= 6,
                  /[A-Z]/.test(form.newPassword),
                  /[0-9]/.test(form.newPassword),
                  /[^A-Za-z0-9]/.test(form.newPassword),
                ].map((met, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${met ? 'bg-green-500' : 'bg-gray-200'}`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-400">
                Stronger password: use uppercase, numbers and symbols
              </p>
            </div>
          )}

          <div className="pt-2">
            <Button type="submit" loading={submitting}>
              Update Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
