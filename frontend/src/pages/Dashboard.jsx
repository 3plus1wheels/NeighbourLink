import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import CreatePost from '../components/CreatePost';
import PostList from '../components/PostList';
import MapView from '../components/MapView';

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

  const indicatorTransform = useMemo(
    () => (viewMode === 'map' ? 'translateX(100%)' : 'translateX(0%)'),
    [viewMode]
  );

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
            <button onClick={() => navigate('/profile')} className="btn-nav btn-secondary">
              Profile
            </button>
            <button onClick={handleLogout} className="btn-nav btn-primary">
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="container-nl">
        {/* Welcome card */}
        <section className="card card-hover mb-6">
          <div className="section-head"><h1>Welcome back</h1></div>
          <div className="grid gap-2 text-[15px]">
            <div><span className="font-semibold">Username:</span> {user?.username}</div>
            <div><span className="font-semibold">Email:</span> {user?.email}</div>
            {user?.first_name && (
              <div><span className="font-semibold">Name:</span> {user.first_name} {user.last_name}</div>
            )}
            <div>
              <span className="font-semibold">Member since:</span>{' '}
              {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : '—'}
            </div>
            <div><span className="font-semibold">Postal Code:</span> {user?.profile?.postal_code || '—'}</div>
          </div>
        </section>

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

        {/* Info card (optional) */}
        {!showCreatePost && (
          <section className="card mt-6">
            <div className="section-head"><h2>Features</h2></div>
            <ul className="grid gap-2 text-gray-800">
              <li>• Create posts with images</li>
              <li>• Set urgency levels (Low, Medium, High)</li>
              <li>• Add location information</li>
              <li>• View community posts with filtering</li>
              <li>• JWT-based authentication</li>
            </ul>
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
