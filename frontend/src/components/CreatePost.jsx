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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLocationSelect = (addressData) => {
    setLocationData(addressData);
    // Update location field with formatted address
    setFormData((prev) => ({
      ...prev,
      location: addressData.street_address || '',
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);

    // Create preview URLs
    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    
    // Revoke the URL to avoid memory leaks
    URL.revokeObjectURL(imagePreviews[index]);
    
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create FormData for multipart/form-data request
      const postData = new FormData();
      postData.append('title', formData.title);
      postData.append('body', formData.body);
      postData.append('urgency', formData.urgency);
      postData.append('location', formData.location);
      
      // Append location coordinates if available
      if (locationData) {
        if (locationData.latitude) {
          postData.append('latitude', locationData.latitude);
        }
        if (locationData.longitude) {
          postData.append('longitude', locationData.longitude);
        }
        if (locationData.postal_code) {
          postData.append('postal_code', locationData.postal_code);
        }
      }

      // Append images
      images.forEach((image) => {
        postData.append('images', image);
      });

      const response = await api.post('/posts/create/', postData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess('Post created successfully!');
      
      // Reset form
      setFormData({
        title: '',
        body: '',
        urgency: 'low',
        location: '',
      });
      setLocationData(null);
      setImages([]);
      setImagePreviews([]);

      // Call callback if provided
      if (onPostCreated) {
        onPostCreated(response.data);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const urgencyColors = {
    low: 'bg-green-100 text-green-800 border-green-300',
    med: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    high: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <div className="bg-white border-2 border-black p-6">
      <h2 className="text-2xl font-bold text-black mb-6 uppercase tracking-wide">Create Post</h2>

      {error && (
        <div className="mb-4 p-3 bg-black text-white border-2 border-black">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-white text-black border-2 border-black">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-black"
            placeholder="What do you need help with?"
          />
        </div>

        {/* Body */}
        <div>
          <label htmlFor="body" className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">
            Description
          </label>
          <textarea
            id="body"
            name="body"
            value={formData.body}
            onChange={handleInputChange}
            rows="4"
            className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-black"
            placeholder="Provide more details about your request..."
          />
        </div>

        {/* Urgency */}
        <div>
          <label htmlFor="urgency" className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">
            Urgency Level *
          </label>
          <select
            id="urgency"
            name="urgency"
            value={formData.urgency}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-black bg-white font-medium"
          >
            <option value="low">Low — Can wait</option>
            <option value="med">Medium — Soon</option>
            <option value="high">High — Urgent</option>
          </select>
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">
            Location
          </label>
          <GooglePlacesAutocomplete
            onPlaceSelect={handleLocationSelect}
            placeholder="Search for an address..."
          />
          {locationData && (
            <div className="mt-2 p-3 bg-gray-50 border-2 border-gray-300 text-sm">
              <p className="font-semibold">Selected Location:</p>
              <p>{locationData.street_address}</p>
              <p>{locationData.city}, {locationData.state} {locationData.postal_code}</p>
              <p className="text-xs text-gray-600 mt-1">
                Coordinates: {locationData.latitude?.toFixed(6)}, {locationData.longitude?.toFixed(6)}
              </p>
            </div>
          )}
        </div>

        {/* Images */}
        <div>
          <label htmlFor="images" className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">
            Images (optional)
          </label>
          <input
            type="file"
            id="images"
            name="images"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:border-black"
          />
          <p className="text-xs text-gray-600 mt-2">You can upload multiple images</p>
        </div>

        {/* Image Previews */}
        {imagePreviews.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover border-2 border-black"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-black text-white w-8 h-8 flex items-center justify-center hover:bg-gray-800 font-bold text-xl border-2 border-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={`w-full px-6 py-4 text-white font-bold text-lg uppercase tracking-wide border-2 border-black ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-black hover:bg-gray-800'
            }`}
          >
            {loading ? 'Creating...' : 'Create Post'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
