import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import CreatePost from '../components/CreatePost';
import PostList from '../components/PostList';
import MapView from '../components/MapView';
import api from '../utils/api';

const FeedIcon = ({ className }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const MapIcon = ({ className }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M9 3v15M15 6v15" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
  </svg>
);

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showCreatePost, setShowCreatePost] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [refreshPosts, setRefreshPosts] = useState(0);
  const [urgentPosts, setUrgentPosts] = useState([]);
  const [stats, setStats] = useState({ userPosts: 0, nearbyPosts: 0 });

  const indicatorTransform = useMemo(
    () => (viewMode === 'map' ? 'translateX(100%)' : 'translateX(0%)'),
    [viewMode]
  );

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch urgent posts
      const urgentResponse = await api.get('/posts/?nearby=true&urgency=high');
      const urgentData = Array.isArray(urgentResponse.data)
        ? urgentResponse.data
        : urgentResponse.data.posts || [];
      setUrgentPosts(urgentData.slice(0, 3)); // Show max 3 urgent posts

      // Fetch user's posts count
      const userPostsResponse = await api.get('/profile/posts/');
      setStats(prev => ({ ...prev, userPosts: userPostsResponse.data.length }));

      // Fetch nearby posts count
      const nearbyResponse = await api.get('/posts/?nearby=true');
      const nearbyData = Array.isArray(nearbyResponse.data)
        ? nearbyResponse.data
        : nearbyResponse.data.posts || [];
      setStats(prev => ({ ...prev, nearbyPosts: nearbyData.length }));
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handlePostCreated = () => {
    setShowCreatePost(false);
    setRefreshPosts((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen">
      {/* Top Nav */}
      <nav className="nav-nl">
        <div className="nav-inner">
          <div className="flex items-center gap-4">
            <div className="brand">NEIGHBOURLINK</div>

            {/* Segmented Toggle (hidden while creating a post) */}
            {!showCreatePost && (
              <div className="segmented">
                <div
                  className="seg-indicator"
                  style={{ transform: indicatorTransform }}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  className="seg-btn"
                  aria-selected={viewMode === 'list'}
                  onClick={() => setViewMode('list')}
                >
                  <FeedIcon />
                  Feed
                </button>
                <button
                  type="button"
                  className="seg-btn"
                  aria-selected={viewMode === 'map'}
                  onClick={() => setViewMode('map')}
                >
                  <MapIcon />
                  Map
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/profile')} className="btn-nav btn-secondary flex items-center gap-2">
              Profile
              <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-bold">
                {user?.profile?.karma_points || 0} Rep
              </span>
            </button>
            <button onClick={handleLogout} className="btn-nav btn-primary">
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="container-nl">
        {/* Urgent Posts Alert & Neighborhood Summary */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Urgent Posts Alert */}
          <section className="card">
            <div className="section-head">
              <h2 className="flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                Urgent in Your Area
              </h2>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              {urgentPosts.length} high-priority posts within 3km
            </div>
            <div className="space-y-3">
              {urgentPosts.length === 0 ? (
                <div className="text-center text-gray-500 py-8 border border-dashed rounded-lg">
                  No urgent posts nearby
                </div>
              ) : (
                urgentPosts.map((post) => (
                  <div key={post.id} className="p-3 border-l-4 border-red-500 bg-red-50 rounded hover:bg-red-100 transition-colors cursor-pointer" onClick={() => setViewMode('list')}>
                    <h3 className="font-bold text-sm mb-1">{post.title}</h3>
                    <p className="text-xs text-gray-600 line-clamp-2">{post.body}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <span>By {post.author_username}</span>
                      <span>•</span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Neighborhood Summary */}
          <section className="card">
            <div className="section-head">
              <h2 className="flex items-center gap-2">
                <span className="text-2xl">📊</span>
                Your Neighborhood
              </h2>
            </div>
            <div className="text-sm font-medium text-gray-700 mb-4">
              📍 {user?.profile?.postal_code || 'No postal code set'}
            </div>
            <div className="grid gap-3 text-[15px]">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-600">Your Posts</span>
                <span className="font-bold text-lg">{stats.userPosts}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-600">Rep Points</span>
                <span className="font-bold text-lg text-indigo-600">{user?.profile?.karma_points || 0}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-600">Member Since</span>
                <span className="font-semibold text-sm">
                  {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Nearby Posts (3km)</span>
                <span className="font-bold text-lg text-green-600">{stats.nearbyPosts}</span>
              </div>
            </div>
          </section>
        </div>

        {/* Create Post CTA */}
        <div className="mb-6">
          <button
            onClick={() => {
              setShowCreatePost(!showCreatePost);
              if (!showCreatePost) setViewMode('list');
            }}
            className="btn btn-primary w-full"
          >
            {showCreatePost ? '← Back to feed' : '+ Create new post'}
          </button>
        </div>

        {/* Main body */}
        {showCreatePost ? (
          <CreatePost onPostCreated={handlePostCreated} />
        ) : viewMode === 'map' ? (
          <MapView nearbyOnly={true} urgencyFilter="all" />
        ) : (
          <PostList refreshTrigger={refreshPosts} />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
