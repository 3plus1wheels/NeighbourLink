import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">NeighbourLink</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user?.username}!</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              🎉 Welcome to NeighbourLink Dashboard!
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Username:</span> {user?.username}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Email:</span> {user?.email}
              </p>
              {user?.first_name && (
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Name:</span> {user.first_name} {user.last_name}
                </p>
              )}
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Member since:</span>{' '}
                {new Date(user?.date_joined).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Address:</span> {user?.address}
              </p>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">🚀 You're all set!</h3>
            <p className="text-gray-700 mb-4">
              Your authentication system is working perfectly. Here's what's implemented:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li>✅ JWT-based authentication</li>
              <li>✅ Secure token storage in localStorage</li>
              <li>✅ Automatic token refresh</li>
              <li>✅ Protected routes</li>
              <li>✅ User registration & login</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
