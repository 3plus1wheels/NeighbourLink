import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile data
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({
    bio: '',
    phone_number: '',
    email: '',
  });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // User posts
  const [userPosts, setUserPosts] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    body: '',
    urgency: 'low',
  });

  // Notification preferences
  const [notifPreferences, setNotifPreferences] = useState({
    min_urgency: 'low',
    sms_enabled: false,
    email_enabled: true,
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const [profileRes, postsRes, notifRes] = await Promise.all([
        api.get('/profile/'),
        api.get('/profile/posts/'),
        api.get('/notifications/preferences/'),
      ]);

      setProfile(profileRes.data);
      setProfileForm({
        bio: profileRes.data.bio || '',
        phone_number: profileRes.data.phone_number || '',
        email: profileRes.data.email || '',
      });
      if (profileRes.data.profile_photo) {
        setPhotoPreview(`http://localhost:8000${profileRes.data.profile_photo}`);
      }

      setUserPosts(postsRes.data);
      setNotifPreferences(notifRes.data);
      setError('');
    } catch (err) {
      setError('Failed to load profile data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Personal Info handlers
  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('bio', profileForm.bio);
      formData.append('phone_number', profileForm.phone_number);
      formData.append('email', profileForm.email);
      if (profilePhoto) {
        formData.append('profile_photo', profilePhoto);
      }

      await api.put('/profile/update/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Profile updated successfully!');
      fetchProfileData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Posts handlers
  const handleEditPost = (post) => {
    setEditingPost(post.id);
    setEditForm({
      title: post.title,
      body: post.body,
      urgency: post.urgency,
    });
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdatePost = async (postId) => {
    try {
      await api.put(`/posts/${postId}/update/`, editForm);
      setSuccess('Post updated successfully!');
      setEditingPost(null);
      fetchProfileData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update post');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await api.delete(`/posts/${postId}/delete/`);
      setSuccess('Post deleted successfully!');
      fetchProfileData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete post');
    }
  };

  // Notification handlers
  const handleNotifChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNotifPreferences((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleNotifUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put('/notifications/preferences/update/', notifPreferences);
      setSuccess('Notification preferences updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update notification preferences');
    }
  };

  const urgencyColors = {
    low: 'bg-green-100 text-green-800',
    med: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-black border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-white hover:text-gray-300 text-sm font-medium"
              >
                ← Back
              </button>
              <h1 className="text-lg font-bold text-white">My Profile</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-black bg-white hover:bg-gray-100 border border-black"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 p-3 bg-black text-white border border-black">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-white text-black border border-black">
            {success}
          </div>
        )}

        {/* Profile Header Card */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-black"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center text-white text-2xl font-bold">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-black">{profile?.username}</h2>
              <p className="text-gray-600">{profile?.email}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-700">
                <span>⭐ {profile?.karmara_points || 0} Points</span>
                {profile?.verified && <span className="font-bold">✓ Verified</span>}
                <span>📝 {profile?.post_count || 0} Posts</span>
                <span>💬 {profile?.comment_count || 0} Comments</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-2 border-black">
          <div className="border-b-2 border-black">
            <nav className="flex space-x-0" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('personal')}
                className={`flex-1 py-4 px-4 border-r-2 border-black font-medium text-sm ${
                  activeTab === 'personal'
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                Personal Info
              </button>
              <button
                onClick={() => setActiveTab('posts')}
                className={`flex-1 py-4 px-4 border-r-2 border-black font-medium text-sm ${
                  activeTab === 'posts'
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                My Posts ({userPosts.length})
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`flex-1 py-4 px-4 font-medium text-sm ${
                  activeTab === 'notifications'
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                Notifications
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Personal Info Tab */}
            {activeTab === 'personal' && (
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">
                    Profile Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={profileForm.email}
                    onChange={handleProfileInputChange}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={profileForm.phone_number}
                    onChange={handleProfileInputChange}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:border-black"
                    placeholder="+1234567890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={profileForm.bio}
                    onChange={handleProfileInputChange}
                    rows="4"
                    maxLength="500"
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:border-black"
                    placeholder="Tell your neighbors about yourself..."
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    {profileForm.bio.length}/500 characters
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-black text-white font-bold uppercase tracking-wide hover:bg-gray-800 disabled:bg-gray-400 border-2 border-black"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            )}

            {/* My Posts Tab */}
            {activeTab === 'posts' && (
              <div className="space-y-4">
                {userPosts.length === 0 ? (
                  <p className="text-center text-gray-600 py-8 border-2 border-dashed border-gray-300">
                    You haven't created any posts yet.
                  </p>
                ) : (
                  userPosts.map((post) => (
                    <div key={post.id} className="border-2 border-black p-4">
                      {editingPost === post.id ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            name="title"
                            value={editForm.title}
                            onChange={handleEditInputChange}
                            className="w-full px-3 py-2 border-2 border-black focus:outline-none"
                          />
                          <textarea
                            name="body"
                            value={editForm.body}
                            onChange={handleEditInputChange}
                            rows="3"
                            className="w-full px-3 py-2 border-2 border-black focus:outline-none"
                          />
                          <select
                            name="urgency"
                            value={editForm.urgency}
                            onChange={handleEditInputChange}
                            className="px-3 py-2 border-2 border-black focus:outline-none"
                          >
                            <option value="low">Low Priority</option>
                            <option value="med">Medium Priority</option>
                            <option value="high">High Priority</option>
                          </select>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleUpdatePost(post.id)}
                              className="px-4 py-2 bg-black text-white font-bold border-2 border-black hover:bg-gray-800"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingPost(null)}
                              className="px-4 py-2 bg-white text-black font-bold border-2 border-black hover:bg-gray-100"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="text-lg font-bold text-black uppercase">
                                {post.title}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {new Date(post.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="px-3 py-1 bg-black text-white text-xs font-bold uppercase tracking-wide">
                              {post.urgency === 'low' && 'Low'}
                              {post.urgency === 'med' && 'Medium'}
                              {post.urgency === 'high' && 'High'}
                            </span>
                          </div>
                          {post.body && <p className="text-gray-800 mb-3 leading-relaxed">{post.body}</p>}
                          {post.images && post.images.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mb-3">
                              {post.images.map((image, idx) => (
                                <img
                                  key={idx}
                                  src={`http://localhost:8000${image.image}`}
                                  alt=""
                                  className="w-full h-20 object-cover border-2 border-black"
                                />
                              ))}
                            </div>
                          )}
                          <div className="flex space-x-2 pt-3 border-t-2 border-gray-200">
                            <button
                              onClick={() => handleEditPost(post)}
                              className="px-4 py-2 text-sm bg-white text-black font-bold border-2 border-black hover:bg-black hover:text-white"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="px-4 py-2 text-sm bg-black text-white font-bold border-2 border-black hover:bg-white hover:text-black"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <form onSubmit={handleNotifUpdate} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-black mb-2 uppercase tracking-wide">
                    Notification Settings
                  </h3>
                  <p className="text-sm text-gray-700 mb-6 leading-relaxed">
                    Choose how and when you want to receive notifications about community posts.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">
                    Minimum Urgency Level
                  </label>
                  <p className="text-xs text-gray-600 mb-2">
                    Only notify me about posts with urgency level:
                  </p>
                  <select
                    name="min_urgency"
                    value={notifPreferences.min_urgency}
                    onChange={handleNotifChange}
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:border-black"
                  >
                    <option value="low">Low and above (all posts)</option>
                    <option value="med">Medium and above</option>
                    <option value="high">High only (urgent)</option>
                  </select>
                </div>

                <div className="space-y-4 border-2 border-black p-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="email_enabled"
                      checked={notifPreferences.email_enabled}
                      onChange={handleNotifChange}
                      className="w-5 h-5 border-2 border-black"
                    />
                    <span className="text-sm font-bold text-black uppercase tracking-wide">
                      Email Notifications
                    </span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="sms_enabled"
                      checked={notifPreferences.sms_enabled}
                      onChange={handleNotifChange}
                      className="w-5 h-5 border-2 border-black"
                    />
                    <span className="text-sm font-bold text-black uppercase tracking-wide">
                      SMS Notifications
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 bg-black text-white font-bold uppercase tracking-wide hover:bg-gray-800 border-2 border-black"
                >
                  Save Preferences
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
