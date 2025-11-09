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
      <div className="bg-white border-2 border-black p-6">
        <p className="text-center text-gray-800">Loading posts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <p className="text-center text-black">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-black p-6">
      <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-black">
        <h2 className="text-2xl font-bold text-black uppercase tracking-wide">Community Posts</h2>
        
        {/* Filter */}
        <div className="flex space-x-0 border-2 border-black">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border-r-2 border-black ${
              filter === 'all'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border-r-2 border-black ${
              filter === 'high'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            Urgent
          </button>
          <button
            onClick={() => setFilter('med')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wide border-r-2 border-black ${
              filter === 'med'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            Medium
          </button>
          <button
            onClick={() => setFilter('low')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wide ${
              filter === 'low'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            Low
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="text-center text-gray-700 py-12 border-2 border-dashed border-gray-300">
          No posts yet. Be the first to create one!
        </p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="border-2 border-black p-5 hover:bg-gray-50 transition-colors"
            >
              {/* Post Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-black uppercase mb-1">
                    {post.title}
                  </h3>
                  <div className="flex items-center space-x-3 text-sm text-gray-700">
                    <span className="font-bold">By {post.author_username}</span>
                    <span>•</span>
                    <span>{formatDate(post.created_at)}</span>
                    {post.neighborhood_name && (
                      <>
                        <span>•</span>
                        <span>{post.neighborhood_name}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wide whitespace-nowrap ml-4">
                  {post.urgency === 'low' && 'Low'}
                  {post.urgency === 'med' && 'Medium'}
                  {post.urgency === 'high' && 'High'}
                </span>
              </div>

              {/* Post Body */}
              {post.body && (
                <p className="text-gray-800 mb-4 leading-relaxed whitespace-pre-wrap">{post.body}</p>
              )}

              {/* Post Images */}
              {post.images && post.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                  {post.images.map((image, index) => (
                    <img
                      key={index}
                      src={`http://localhost:8000${image.image}`}
                      alt={image.caption || `Image ${index + 1}`}
                      className="w-full h-32 object-cover border-2 border-black"
                    />
                  ))}
                </div>
              )}

              {/* Post Footer */}
              <div className="flex items-center space-x-6 text-sm text-gray-700 pt-4 border-t-2 border-gray-200">
                <span className="font-bold">{post.like_count || 0} likes</span>
                <span className="font-bold">{post.comment_count || 0} comments</span>
                {post.dislike_count > 0 && (
                  <span className="font-bold">{post.dislike_count} dislikes</span>
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
