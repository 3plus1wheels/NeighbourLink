import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ phone_number: '', email: '' });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [userPosts, setUserPosts] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', body: '', urgency: 'low' });
  const [editImages, setEditImages] = useState({ existing: [], new: [], remove: [] });
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState({});

  const [notifPreferences, setNotifPreferences] = useState({
    min_urgency: 'low',
    sms_enabled: false,
    email_enabled: true,
  });

  useEffect(() => { fetchProfileData(); }, []);

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
        phone_number: profileRes.data.phone_number || '',
        email: profileRes.data.email || '',
      });
      if (profileRes.data.profile_photo) setPhotoPreview(`http://localhost:8000${profileRes.data.profile_photo}`);
      setUserPosts(postsRes.data);
      setNotifPreferences(notifRes.data);
      setError('');
    } catch {
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileInputChange = (e) => setProfileForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) { setProfilePhoto(file); setPhotoPreview(URL.createObjectURL(file)); }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const fd = new FormData();
      fd.append('phone_number', profileForm.phone_number);
      fd.append('email', profileForm.email);
      if (profilePhoto) fd.append('profile_photo', profilePhoto);
      await api.put('/profile/update/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess('Profile updated successfully!');
      fetchProfileData();
      setTimeout(() => setSuccess(''), 2500);
    } catch {
      setError('Failed to update profile');
    } finally { setLoading(false); }
  };

  const handleEditPost = (post) => {
    setEditingPost(post.id);
    setEditForm({ title: post.title, body: post.body, urgency: post.urgency });
    setEditImages({ existing: post.images || [], new: [], remove: [] });
    setNewImagePreviews([]);
  };
  
  const handleEditInputChange = (e) => setEditForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleNewImageAdd = (e) => {
    const files = Array.from(e.target.files || []);
    const remainingExisting = editImages.existing.length - editImages.remove.length;
    const totalAfterAdd = remainingExisting + editImages.new.length + files.length;
    
    if (totalAfterAdd > 5) {
      setError(`Cannot add ${files.length} images. Post would have ${totalAfterAdd} images (max: 5).`);
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    setEditImages(prev => ({ ...prev, new: [...prev.new, ...files] }));
    setNewImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeNewImage = (index) => {
    URL.revokeObjectURL(newImagePreviews[index]);
    setEditImages(prev => ({ ...prev, new: prev.new.filter((_, i) => i !== index) }));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const toggleRemoveExistingImage = (imageId) => {
    setEditImages(prev => ({
      ...prev,
      remove: prev.remove.includes(imageId)
        ? prev.remove.filter(id => id !== imageId)
        : [...prev.remove, imageId]
    }));
  };

  const handleUpdatePost = async (postId) => {
    try {
      const fd = new FormData();
      fd.append('title', editForm.title);
      fd.append('body', editForm.body);
      fd.append('urgency', editForm.urgency);
      
      editImages.remove.forEach(id => fd.append('remove_image_ids', id));
      editImages.new.forEach(img => fd.append('new_images', img));
      
      await api.put(`/posts/${postId}/update/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setSuccess('Post updated successfully!');
      setEditingPost(null);
      setEditImages({ existing: [], new: [], remove: [] });
      setNewImagePreviews([]);
      fetchProfileData();
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.new_images?.[0] || 'Failed to update post');
    }
  };
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await api.delete(`/posts/${postId}/delete/`);
      setSuccess('Post deleted successfully!'); fetchProfileData(); setTimeout(() => setSuccess(''), 2500);
    } catch { setError('Failed to delete post'); }
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

  const handleNotifChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNotifPreferences((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };
  const handleNotifUpdate = async (e) => {
    e.preventDefault();
    try { await api.put('/notifications/preferences/update/', notifPreferences); setSuccess('Notification preferences updated!'); setTimeout(() => setSuccess(''), 2500); }
    catch { setError('Failed to update notification preferences'); }
  };



  const handleLogout = async () => { await logout(); navigate('/login'); };

  if (loading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <nav className="nav-nl">
        <div className="nav-inner">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="btn-nav btn-secondary">← Back</button>
            <div className="brand text-xl">My Profile</div>
          </div>
          <button onClick={handleLogout} className="btn-nav btn-primary">Logout</button>
        </div>
      </nav>

      <main className="container-nl">
        {error && <div className="card mb-4"><p className="text-red-700">{error}</p></div>}
        {success && <div className="card mb-4"><p className="text-green-700">{success}</p></div>}

        {/* Header card */}
        <section className="card card-hover mb-6">
          <div className="flex items-center gap-4">
            {photoPreview ? (
              <img src={photoPreview} alt="Profile" className="w-20 h-20 rounded-full object-cover border" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-black text-white flex items-center justify-center text-2xl font-bold">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold">{profile?.username}</h2>
              <p className="text-gray-600">{profile?.email}</p>
              <div className="small mt-2 flex gap-4">
                <span> {profile?.karmara_points || 0} Points</span>
                <span> {profile?.post_count || 0} Posts</span>
              </div>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section className="card">
          <div className="mb-4 flex gap-2">
            <button className="tab" aria-selected={activeTab === 'posts'} onClick={() => setActiveTab('posts')}>
               My Posts ({userPosts.length})
            </button>
            <button className="tab" aria-selected={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')}>
               Notifications
            </button>
            <button className="tab" aria-selected={activeTab === 'personal'} onClick={() => setActiveTab('personal')}>
               Edit Profile
            </button>
            
          </div>

          {/* Personal */}
          {activeTab === 'personal' && (
            <form onSubmit={handleProfileUpdate} className="grid gap-6">

              <div>
                <label className="block text-sm font-semibold mb-2">Email</label>
                <input className="input" type="email" name="email" value={profileForm.email} onChange={handleProfileInputChange} />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Phone number</label>
                <input className="input" type="tel" name="phone_number" value={profileForm.phone_number} onChange={handleProfileInputChange} placeholder="+1234567890" />
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary w-full sm:w-auto">
                {loading ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          )}

          {/* Posts */}
          {activeTab === 'posts' && (
            <div className="grid gap-4">
              {userPosts.length === 0 ? (
                <p className="text-center text-gray-600 py-12 border border-dashed rounded-lg">You haven’t created any posts yet.</p>
              ) : (
                userPosts.map((post) => (
                  <div key={post.id} className="card">
                    {editingPost === post.id ? (
                      <div className="grid gap-4">
                        <div>
                          <label className="block text-sm font-semibold mb-2">Title</label>
                          <input className="input" name="title" value={editForm.title} onChange={handleEditInputChange} required />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold mb-2">Description</label>
                          <textarea className="textarea" name="body" rows={3} value={editForm.body} onChange={handleEditInputChange} />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold mb-2">Urgency</label>
                          <select className="select" name="urgency" value={editForm.urgency} onChange={handleEditInputChange}>
                            <option value="low">Low — Can wait</option>
                            <option value="med">Medium — Soon</option>
                            <option value="high">High — Urgent</option>
                          </select>
                        </div>

                        {/* Existing Images */}
                        {editImages.existing.length > 0 && (
                          <div>
                            <label className="block text-sm font-semibold mb-2">Current Images</label>
                            <p className="text-xs text-gray-600 mb-2">Click images to mark for removal</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {editImages.existing.map((image) => (
                                <div
                                  key={image.id}
                                  className={`relative cursor-pointer rounded-lg overflow-hidden border-4 transition-all ${
                                    editImages.remove.includes(image.id)
                                      ? 'border-red-500 opacity-50'
                                      : 'border-transparent hover:border-gray-300'
                                  }`}
                                  onClick={() => toggleRemoveExistingImage(image.id)}
                                >
                                  <img
                                    src={`http://localhost:8000${image.image}`}
                                    alt={image.caption || 'Post image'}
                                    className="thumb w-full h-24 object-cover"
                                  />
                                  {editImages.remove.includes(image.id) && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-red-500/30">
                                      <span className="text-white font-bold text-3xl">✕</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* New Images */}
                        <div>
                          <label className="block text-sm font-semibold mb-2">Add New Images (max 5 total)</label>
                          <input type="file" accept="image/*" multiple onChange={handleNewImageAdd} className="mt-2" />
                          <p className="text-xs text-gray-600 mt-1">
                            Current: {editImages.existing.length - editImages.remove.length} | New: {editImages.new.length} | 
                            Total: {editImages.existing.length - editImages.remove.length + editImages.new.length} / 5
                          </p>
                        </div>

                        {newImagePreviews.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {newImagePreviews.map((src, i) => (
                              <div key={i} className="relative">
                                <img src={src} alt={`New ${i + 1}`} className="thumb w-full h-24 object-cover" />
                                <button
                                  type="button"
                                  onClick={() => removeNewImage(i)}
                                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button onClick={() => handleUpdatePost(post.id)} className="btn btn-primary">Save Changes</button>
                          <button onClick={() => { setEditingPost(null); setEditImages({ existing: [], new: [], remove: [] }); setNewImagePreviews([]); }} className="btn btn-secondary">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="post-title">{post.title}</h3>
                            <p className="small">{new Date(post.created_at).toLocaleDateString()}</p>
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
                            {post.urgency.toUpperCase()}
                          </span>
                        </div>
                        {post.body && <p className="text-[15.5px] text-gray-800 mb-3">{post.body}</p>}
                        
                        {/* Image Carousel */}
                        {post.images?.length > 0 && (
                          <div className="relative mb-3">
                            <div className="relative w-full h-80 bg-gray-100 rounded-lg overflow-hidden">
                              <img
                                src={`http://localhost:8000${post.images[currentImageIndex[post.id] || 0].image}`}
                                alt={post.images[currentImageIndex[post.id] || 0].caption || `Image ${(currentImageIndex[post.id] || 0) + 1}`}
                                className="w-full h-full object-contain"
                              />
                              
                              {post.images.length > 1 && (
                                <>
                                  <button
                                    onClick={() => handlePrevImage(post.id, post.images.length)}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
                                  >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleNextImage(post.id, post.images.length)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
                                  >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </button>
                                </>
                              )}
                              
                              <div className="absolute bottom-2 right-2 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium">
                                {(currentImageIndex[post.id] || 0) + 1} / {Math.min(post.images.length, 5)}
                              </div>
                            </div>
                            
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
                        
                        <div className="flex gap-2 pt-3">
                          <button onClick={() => handleEditPost(post)} className="btn btn-secondary">✏️ Edit</button>
                          <button onClick={() => handleDeletePost(post.id)} className="btn btn-primary">🗑️ Delete</button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

                    {/* Notifications */}
          {activeTab === 'notifications' && (
            <form onSubmit={handleNotifUpdate} className="grid gap-6">
              <div>
                <h3 className="text-lg font-bold mb-1">Notification settings</h3>
                <p className="small">Choose how and when you're notified about community posts.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Minimum urgency</label>
                <select className="select" name="min_urgency" value={notifPreferences.min_urgency} onChange={handleNotifChange}>
                  <option value="low">Low and above (all posts)</option>
                  <option value="med">Medium and above</option>
                  <option value="high">High only (urgent)</option>
                </select>
              </div>

              <div className="card">
                <label className="flex items-center gap-3">
                  <input type="checkbox" name="email_enabled" checked={notifPreferences.email_enabled} onChange={handleNotifChange} />
                  <span className="font-semibold text-sm">Email notifications</span>
                </label>
                <label className="flex items-center gap-3 mt-3">
                  <input type="checkbox" name="sms_enabled" checked={notifPreferences.sms_enabled} onChange={handleNotifChange} />
                  <span className="font-semibold text-sm">SMS notifications</span>
                </label>
              </div>

              <button type="submit" className="btn btn-primary w-full sm:w-auto">Save preferences</button>
            </form>
          )}

          
        </section>
      </main>
    </div>
  );
};

export default Profile;
