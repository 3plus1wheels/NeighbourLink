import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import CreatePost from '../components/CreatePost';
import PostList from '../components/PostList';
import MapView from '../components/MapView';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [refreshPosts, setRefreshPosts] = useState(0);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handlePostCreated = () => {
    setShowCreatePost(false);
    setRefreshPosts((prev) => prev + 1); // Trigger post list refresh
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-black border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-6">
              <h1 className="text-xl font-bold text-white tracking-wide">NEIGHBOURLINK</h1>
              {!showCreatePost && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2 text-sm font-medium border transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white text-black border-white'
                        : 'bg-black text-white border-white hover:bg-gray-800'
                    }`}
                  >
                    📋 Feed
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`px-4 py-2 text-sm font-medium border transition-colors ${
                      viewMode === 'map'
                        ? 'bg-white text-black border-white'
                        : 'bg-black text-white border-white hover:bg-gray-800'
                    }`}
                  >
                    🗺️ Map
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/profile')}
                className="px-4 py-2 text-sm font-medium text-black bg-white hover:bg-gray-100 border border-white"
              >
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 border border-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Card */}
          <div className="bg-white border-2 border-black p-6 mb-6">
            <h2 className="text-2xl font-bold text-black mb-4 uppercase tracking-wide">
              Welcome Back
            </h2>
            <div className="bg-white border-2 border-gray-300 p-4 space-y-2">
              <p className="text-sm text-gray-800">
                <span className="font-bold">Username:</span> {user?.username}
              </p>
              <p className="text-sm text-gray-800">
                <span className="font-bold">Email:</span> {user?.email}
              </p>
              {user?.first_name && (
                <p className="text-sm text-gray-800">
                  <span className="font-bold">Name:</span> {user.first_name} {user.last_name}
                </p>
              )}
              <p className="text-sm text-gray-800">
                <span className="font-bold">Member since:</span>{' '}
                {new Date(user?.date_joined).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Postal Code:</span> {user.profile.postal_code}
              </p>
            </div>
          </div>

          {/* Create Post Button */}
          <div className="mb-6">
            <button
              onClick={() => {
                setShowCreatePost(!showCreatePost);
                if (!showCreatePost) setViewMode('list');
              }}
              className="w-full px-6 py-4 bg-black text-white font-bold text-lg uppercase tracking-wide hover:bg-gray-800 border-2 border-black transition-colors"
            >
              {showCreatePost ? '← Back to Feed' : '+ Create New Post'}
            </button>
          </div>

          {/* Create Post Form, Post List, or Map View */}
          {showCreatePost ? (
            <CreatePost onPostCreated={handlePostCreated} />
          ) : viewMode === 'map' ? (
            <MapView nearbyOnly={true} urgencyFilter="all" />
          ) : (
            <PostList refreshTrigger={refreshPosts} />
          )}

          {/* Info Card */}
          {!showCreatePost && (
            <div className="bg-white border-2 border-black p-6 mt-6">
              <h3 className="text-xl font-bold text-black mb-3 uppercase tracking-wide">Features</h3>
              <p className="text-gray-800 mb-4 leading-relaxed">
                Your NeighbourLink platform is ready for use.
              </p>
              <ul className="space-y-2 text-gray-800">
                <li className="flex items-start">
                  <span className="font-bold mr-2">—</span>
                  <span>Create posts with images</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2">—</span>
                  <span>Set urgency levels (Low, Medium, High)</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2">—</span>
                  <span>Add location information</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2">—</span>
                  <span>View community posts with filtering</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2">—</span>
                  <span>JWT-based authentication</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
