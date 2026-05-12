import { useSelector } from 'react-redux';
import { useLogout } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const logout = useLogout();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm px-6 py-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-gray-700">Krushi Seva Kendra</h2>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          👤 {user?.name}{' '}
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full capitalize">
            {user?.role}
          </span>
        </span>
        <button
          onClick={handleLogout}
          className="text-sm text-red-500 hover:text-red-700 font-medium"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Navbar;
