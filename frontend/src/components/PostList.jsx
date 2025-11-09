import { useState, useEffect } from 'react';
import api from '../utils/api';

const PostList = ({ refreshTrigger }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchPosts();
  }, [refreshTrigger, filter]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const url = filter === 'all' ? '/posts/' : `/posts/?urgency=${filter}`;
      const response = await api.get(url);
      setPosts(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load posts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const urgencyBadges = {
    low: { bg: 'bg-green-100', text: 'text-green-800', label: '🟢 Low' },
    med: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '🟡 Medium' },
    high: { bg: 'bg-red-100', text: 'text-red-800', label: '🔴 High' },
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-center text-gray-500">Loading posts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-center text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Community Posts</h2>
        
        {/* Filter */}
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === 'high'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Urgent
          </button>
          <button
            onClick={() => setFilter('med')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === 'med'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Medium
          </button>
          <button
            onClick={() => setFilter('low')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === 'low'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Low
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="text-center text-gray-500 py-8">
          No posts yet. Be the first to create one!
        </p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Post Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {post.title}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>By {post.author_username}</span>
                    <span>•</span>
                    <span>{formatDate(post.created_at)}</span>
                    {post.neighborhood_name && (
                      <>
                        <span>•</span>
                        <span>📍 {post.neighborhood_name}</span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    urgencyBadges[post.urgency].bg
                  } ${urgencyBadges[post.urgency].text}`}
                >
                  {urgencyBadges[post.urgency].label}
                </span>
              </div>

              {/* Post Body */}
              {post.body && (
                <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.body}</p>
              )}

              {/* Post Images */}
              {post.images && post.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  {post.images.map((image, index) => (
                    <img
                      key={index}
                      src={`http://localhost:8000${image.image}`}
                      alt={image.caption || `Image ${index + 1}`}
                      className="w-full h-32 object-cover rounded-md border border-gray-300"
                    />
                  ))}
                </div>
              )}

              {/* Post Footer */}
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>👍 {post.like_count || 0} likes</span>
                <span>💬 {post.comment_count || 0} comments</span>
                {post.dislike_count > 0 && (
                  <span>👎 {post.dislike_count}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PostList;
