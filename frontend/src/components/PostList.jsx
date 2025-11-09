import { useState, useEffect } from 'react';
import api from '../utils/api';

const PostList = ({ refreshTrigger }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [nearbyOnly, setNearbyOnly] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [refreshTrigger, filter, nearbyOnly]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      let url = '/posts/';

      const params = [];
      if (nearbyOnly) params.push('nearby=true');
      if (filter !== 'all') params.push(`urgency=${filter}`);
      if (params.length > 0) url += '?' + params.join('&');

      const response = await api.get(url);
      const postsData = Array.isArray(response.data)
        ? response.data
        : response.data.posts || [];

      setPosts(postsData);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load posts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();

    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const m = Math.floor((now - date) / (1000 * 60));
      return `${m} minute${m !== 1 ? 's' : ''} ago`;
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

  if (loading)
    return (
      <div className="card">
        <p className="text-center text-gray-700">Loading posts...</p>
      </div>
    );

  if (error)
    return (
      <div className="card">
        <p className="text-center text-red-700">{error}</p>
      </div>
    );

  return (
    <section className="card">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => setNearbyOnly(!nearbyOnly)}
          className={`btn ${nearbyOnly ? 'btn-primary' : 'btn-secondary'}`}
        >
          {nearbyOnly ? '📍 Nearby (3km)' : '🌍 All posts'}
        </button>

        <span className="small">
          {nearbyOnly
            ? 'Showing posts within 3km of your location'
            : 'Showing all posts'}
        </span>
      </div>

      <div className="section-head flex items-center justify-between">
        <h2>Community Posts</h2>

        <div className="tabs">
          <button
            className="tab"
            aria-selected={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            All
          </button>

          <button
            className="tab"
            aria-selected={filter === 'high'}
            onClick={() => setFilter('high')}
          >
            Urgent
          </button>

          <button
            className="tab"
            aria-selected={filter === 'med'}
            onClick={() => setFilter('med')}
          >
            Medium
          </button>

          <button
            className="tab"
            aria-selected={filter === 'low'}
            onClick={() => setFilter('low')}
          >
            Low
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <p
          className="text-center text-gray-600 py-12 border border-dashed rounded-lg"
          style={{ borderColor: '#D4D4D8' }}
        >
          No posts yet. Be the first to create one!
        </p>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <article key={post.id} className="card card-hover">
              <div className="post-hdr mb-2">
                <div className="flex-1">
                  <h3 className="post-title mb-1">{post.title}</h3>

                  <div className="post-meta">
                    <span className="font-semibold">
                      By {post.author_username}
                    </span>
                    <span>•</span>
                    <span>{formatDate(post.created_at)}</span>
                  </div>
                </div>

                <span
                  className={
                    post.urgency === 'high'
                      ? 'badge badge-high'
                      : post.urgency === 'med'
                      ? 'badge badge-med'
                      : 'badge badge-low'
                  }
                >
                  {post.urgency === 'high' && 'HIGH'}
                  {post.urgency === 'med' && 'MEDIUM'}
                  {post.urgency === 'low' && 'LOW'}
                </span>
              </div>

              {post.body && (
                <p className="text-[15.5px] text-gray-800 mb-3 whitespace-pre-wrap">
                  {post.body}
                </p>
              )}

              {post.images && post.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  {post.images.map((image, i) => (
                    <img
                      key={i}
                      src={`http://localhost:8000${image.image}`}
                      alt={image.caption || `Image ${i + 1}`}
                      className="thumb w-full h-32 object-cover"
                    />
                  ))}
                </div>
              )}

              <div className="post-ftr">
                <span className="font-semibold">{post.like_count || 0} likes</span>
                <span className="font-semibold">
                  {post.comment_count || 0} comments
                </span>

                {post.dislike_count > 0 && (
                  <span className="font-semibold">
                    {post.dislike_count} dislikes
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default PostList;
