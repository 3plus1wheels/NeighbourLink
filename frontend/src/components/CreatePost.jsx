import { useState } from 'react';
import api from '../utils/api';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';

const CreatePost = ({ onPostCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    urgency: 'low',
    location: '',
  });
  const [locationData, setLocationData] = useState(null);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationSelect = (addr) => {
    setLocationData(addr);
    setFormData((prev) => ({ ...prev, location: addr.street_address || '' }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    setImages(files);
    setImagePreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (i) => {
    URL.revokeObjectURL(imagePreviews[i]);
    setImages(images.filter((_, idx) => idx !== i));
    setImagePreviews(imagePreviews.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const postData = new FormData();
      postData.append('title', formData.title);
      postData.append('body', formData.body);
      postData.append('urgency', formData.urgency);
      postData.append('location', formData.location);

      if (locationData) {
        if (locationData.latitude) postData.append('latitude', locationData.latitude);
        if (locationData.longitude) postData.append('longitude', locationData.longitude);
        if (locationData.postal_code) postData.append('postal_code', locationData.postal_code);
      }

      images.forEach((img) => postData.append('images', img));

      const res = await api.post('/posts/create/', postData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Post created successfully!');
      setFormData({ title: '', body: '', urgency: 'low', location: '' });
      setLocationData(null);
      setImages([]);
      setImagePreviews([]);
      onPostCreated && onPostCreated(res.data);
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card">
      <div className="section-head"><h2>Create Post</h2></div>

      {error && <div className="card mb-4"><p className="text-red-700">{error}</p></div>}
      {success && <div className="card mb-4"><p className="text-green-700">{success}</p></div>}

      <form onSubmit={handleSubmit} className="grid gap-6">
        <div>
          <label className="block text-sm font-semibold mb-2">Title *</label>
          <input
            className="input"
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            placeholder="Write a short, clear title"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Description</label>
          <textarea
            className="textarea"
            name="body"
            rows={4}
            value={formData.body}
            onChange={handleInputChange}
            placeholder="Add helpful details…"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Urgency level *</label>
          <select
            className="select"
            name="urgency"
            value={formData.urgency}
            onChange={handleInputChange}
          >
            <option value="low">Low — Can wait</option>
            <option value="med">Medium — Soon</option>
            <option value="high">High — Urgent</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Location</label>
          <GooglePlacesAutocomplete onPlaceSelect={handleLocationSelect} placeholder="Search for an address…" />
          {locationData && (
            <div className="mt-3 card">
              <p className="font-semibold">Selected Location</p>
              <p className="text-sm text-gray-700">{locationData.street_address}</p>
              <p className="text-sm text-gray-700">
                {locationData.city}, {locationData.state} {locationData.postal_code}
              </p>
              <p className="small mt-1">
                Coordinates: {locationData.latitude?.toFixed(6)}, {locationData.longitude?.toFixed(6)}
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Images (optional)</label>
          <div className="upload">Drag & drop or click to select</div>
          <input type="file" accept="image/*" multiple onChange={handleImageChange} className="mt-2" />
          <p className="small mt-1">You can upload multiple images.</p>
        </div>

        {imagePreviews.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {imagePreviews.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt={`Preview ${i + 1}`} className="thumb w-full h-32 object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-2 right-2 btn btn-primary !px-2 !py-1"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? 'Creating…' : 'Create Post'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default CreatePost;
