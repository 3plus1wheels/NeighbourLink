import { useState, useEffect } from 'react';
import api from '../utils/api';

const PostList = ({ refreshTrigger }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('time'); // 'time', 'urgency', 'upvotes'
  const [currentImageIndex, setCurrentImageIndex] = useState({});

  useEffect(() => {
    fetchPosts();
  }, [refreshTrigger, filter, sortBy]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      let url = '/posts/';

      const params = ['nearby=true']; // Always fetch nearby posts only
      if (filter !== 'all') params.push(`urgency=${filter}`);
      if (params.length > 0) url += '?' + params.join('&');

      const response = await api.get(url);
      const postsData = Array.isArray(response.data)
        ? response.data
        : response.data.posts || [];

      // Sort posts based on selected sort option
      const sortedPosts = sortPosts(postsData, sortBy);
      setPosts(sortedPosts);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load posts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sortPosts = (postsArray, sortOption) => {
    const sorted = [...postsArray];
    
    switch (sortOption) {
      case 'time':
        // Sort by newest first (default)
        return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      case 'urgency':
        // Sort by urgency level: high > medium > low, then by time
        const urgencyOrder = { high: 3, med: 2, low: 1 };
        return sorted.sort((a, b) => {
          const urgencyDiff = (urgencyOrder[b.urgency] || 0) - (urgencyOrder[a.urgency] || 0);
          if (urgencyDiff !== 0) return urgencyDiff;
          // If same urgency, sort by time
          return new Date(b.created_at) - new Date(a.created_at);
        });
      
      case 'upvotes':
        // Sort by most upvotes first, then by time
        return sorted.sort((a, b) => {
          const upvoteDiff = (b.upvote_count || 0) - (a.upvote_count || 0);
          if (upvoteDiff !== 0) return upvoteDiff;
          // If same upvotes, sort by time
          return new Date(b.created_at) - new Date(a.created_at);
        });
      
      default:
        return sorted;
    }
  };

  const handleVote = async (postId, voteType) => {
    try {
      const currentPost = posts.find(p => p.id === postId);
      const currentVote = currentPost?.user_vote;
      
      // If clicking the same vote, remove it
      const actualVoteType = currentVote === voteType ? 'remove' : voteType;
      
      const response = await api.post(`/posts/${postId}/vote/`, {
        vote_type: actualVoteType
      });
      
      // Update the post in the list with new vote counts
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            upvote_count: response.data.upvote_count,
            downvote_count: response.data.downvote_count,
            vote_score: response.data.vote_score,
            user_vote: response.data.user_vote
          };
        }
        return post;
      }));
    } catch (err) {
      console.error('Failed to vote:', err);
      setError(err.response?.data?.error || 'Failed to vote');
    }
  };

  const handleNextImage = (postId, imageCount) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [postId]: ((prev[postId] || 0) + 1) % imageCount
    }));
  };

  const handlePrevImage = (postId, imageCount) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [postId]: ((prev[postId] || 0) - 1 + imageCount) % imageCount
    }));
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
      <div className="section-head flex items-center justify-between">
        <div>
          <h2>Community Posts</h2>
          <p className="text-sm text-gray-600 mt-1">📍 Showing posts within 3km of your location</p>
        </div>

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
            High
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

      {/* Sort Options */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Sort by:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('time')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              sortBy === 'time'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🕒 Newest
          </button>
          <button
            onClick={() => setSortBy('urgency')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              sortBy === 'urgency'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🚨 Urgency
          </button>
          <button
            onClick={() => setSortBy('upvotes')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              sortBy === 'upvotes'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ▲ Most Upvoted
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
                      <span className="text-xs text-indigo-600 ml-1.5 font-semibold">{post.author_karma || 0} Rep</span>
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
                <div className="relative mb-3">
                  {/* Carousel Container */}
                  <div className="relative w-full h-80 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={`http://localhost:8000${post.images[currentImageIndex[post.id] || 0].image}`}
                      alt={post.images[currentImageIndex[post.id] || 0].caption || `Image ${(currentImageIndex[post.id] || 0) + 1}`}
                      className="w-full h-full object-contain"
                    />
                    
                    {/* Navigation Arrows - Only show if more than 1 image */}
                    {post.images.length > 1 && (
                      <>
                        <button
                          onClick={() => handlePrevImage(post.id, post.images.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
                          aria-label="Previous image"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleNextImage(post.id, post.images.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
                          aria-label="Next image"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </>
                    )}
                    
                    {/* Image Counter */}
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {(currentImageIndex[post.id] || 0) + 1} / {Math.min(post.images.length, 5)}
                    </div>
                  </div>
                  
                  {/* Thumbnail Navigation - Only show if more than 1 image */}
                  {post.images.length > 1 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                      {post.images.slice(0, 5).map((image, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentImageIndex(prev => ({ ...prev, [post.id]: i }))}
                          className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
                            (currentImageIndex[post.id] || 0) === i
                              ? 'border-indigo-600 shadow-md'
                              : 'border-gray-300 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={`http://localhost:8000${image.image}`}
                            alt={`Thumbnail ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

                            <div className="post-ftr flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleVote(post.id, 'upvote')}
                    className={`flex items-center gap-1 ${
                      post.user_vote === 'upvote'
                        ? 'text-green-600 font-bold'
                        : 'text-gray-600 hover:text-green-600'
                    }`}
                  >
                    <span className="text-xl">▲</span>
                    <span className="font-semibold">{post.upvote_count || 0}</span>
                  </button>
                  
                  <button
                    onClick={() => handleVote(post.id, 'downvote')}
                    className={`flex items-center gap-1 ${
                      post.user_vote === 'downvote'
                        ? 'text-red-600 font-bold'
                        : 'text-gray-600 hover:text-red-600'
                    }`}
                  >
                    <span className="text-xl">▼</span>
                    <span className="font-semibold">{post.downvote_count || 0}</span>
                  </button>
                  
                  <span className="text-gray-600">
                    <span className="font-bold">{post.vote_score || 0}</span> score
                  </span>
                </div>

                <span className="font-semibold text-gray-600">
                  💬 {post.comment_count || 0} comments
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default PostList;
