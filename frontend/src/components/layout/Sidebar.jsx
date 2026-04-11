import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';

const Sidebar = () => {
  const { user } = useSelector((s) => s.auth);

  const navItems = [
    { to: '/',          label: '📊 Dashboard',  end: true },
    { to: '/products',  label: '🌱 Products' },
    { to: '/orders',    label: '📦 Orders' },
    { to: '/customers', label: '👨‍🌾 Customers' },
    ...(user?.role === 'admin' ? [{ to: '/users', label: '👥 Users' }] : []),
  ];

  return (
    <aside className="w-64 bg-green-800 text-white flex flex-col">
      <div className="p-5 border-b border-green-700">
        <h1 className="text-xl font-bold">🌾 Krushi Seva</h1>
        <p className="text-green-300 text-xs mt-1">Kendra ERP</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-green-600 text-white'
                  : 'text-green-100 hover:bg-green-700'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Profile link at bottom */}
      <div className="p-4 border-t border-green-700">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-green-600 text-white' : 'text-green-100 hover:bg-green-700'
            }`
          }
        >
          <span className="text-base">👤</span>
          <span>{user?.name || 'Profile'}</span>
        </NavLink>
        <p className="text-green-500 text-xs mt-3 text-center">
          v1.0.0 &copy; Krushi Seva Kendra
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
