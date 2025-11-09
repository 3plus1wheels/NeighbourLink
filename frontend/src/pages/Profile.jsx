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

  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ bio: '', phone_number: '', email: '' });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [userPosts, setUserPosts] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', body: '', urgency: 'low' });

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
        bio: profileRes.data.bio || '',
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
      fd.append('bio', profileForm.bio);
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
  };
  const handleEditInputChange = (e) => setEditForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleUpdatePost = async (postId) => {
    try {
      await api.put(`/posts/${postId}/update/`, editForm);
      setSuccess('Post updated successfully!'); setEditingPost(null); fetchProfileData(); setTimeout(() => setSuccess(''), 2500);
    } catch { setError('Failed to update post'); }
  };
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await api.delete(`/posts/${postId}/delete/`);
      setSuccess('Post deleted successfully!'); fetchProfileData(); setTimeout(() => setSuccess(''), 2500);
    } catch { setError('Failed to delete post'); }
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
                <span>⭐ {profile?.karmara_points || 0} Points</span>
                <span>📝 {profile?.post_count || 0} Posts</span>
                <span>💬 {profile?.comment_count || 0} Comments</span>
              </div>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section className="card">
          <div className="mb-4 flex gap-2">
            <button className="tab" aria-selected={activeTab === 'personal'} onClick={() => setActiveTab('personal')}>
              Personal Info
            </button>
            <button className="tab" aria-selected={activeTab === 'posts'} onClick={() => setActiveTab('posts')}>
              My Posts ({userPosts.length})
            </button>
            <button className="tab" aria-selected={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')}>
              Notifications
            </button>
            
          </div>

          {/* Personal */}
          {activeTab === 'personal' && (
            <form onSubmit={handleProfileUpdate} className="grid gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Profile photo</label>
                <input type="file" accept="image/*" onChange={handlePhotoChange} />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Email</label>
                <input className="input" type="email" name="email" value={profileForm.email} onChange={handleProfileInputChange} />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Phone number</label>
                <input className="input" type="tel" name="phone_number" value={profileForm.phone_number} onChange={handleProfileInputChange} placeholder="+1234567890" />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Bio</label>
                <textarea className="textarea" rows={4} name="bio" value={profileForm.bio} onChange={handleProfileInputChange} maxLength={500} placeholder="Tell your neighbors about yourself…" />
                <p className="small mt-1">{profileForm.bio.length}/500 characters</p>
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
                      <div className="grid gap-3">
                        <input className="input" name="title" value={editForm.title} onChange={handleEditInputChange} />
                        <textarea className="textarea" name="body" rows={3} value={editForm.body} onChange={handleEditInputChange} />
                        <select className="select" name="urgency" value={editForm.urgency} onChange={handleEditInputChange}>
                          <option value="low">Low</option>
                          <option value="med">Medium</option>
                          <option value="high">High</option>
                        </select>
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdatePost(post.id)} className="btn btn-primary">Save</button>
                          <button onClick={() => setEditingPost(null)} className="btn btn-secondary">Cancel</button>
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
                        {post.images?.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                            {post.images.map((img, i) => (
                              <img key={i} src={`http://localhost:8000${img.image}`} className="thumb w-full h-20 object-cover" />
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 pt-3">
                          <button onClick={() => handleEditPost(post)} className="btn btn-secondary">Edit</button>
                          <button onClick={() => handleDeletePost(post.id)} className="btn btn-primary">Delete</button>
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
