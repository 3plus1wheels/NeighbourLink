import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GooglePlacesAutocomplete from '../components/GooglePlacesAutocomplete';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({ username: '', email: '', password: '', password2: '' });
  const [addressData, setAddressData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handlePlaceSelect = (place) => setAddressData(place);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.password2) return setError("Passwords don't match");
    if (formData.password.length < 8) return setError('Password must be at least 8 characters');

    setLoading(true);
    const payload = { ...formData, ...(addressData || {}) };
    const result = await register(payload);
    result.success ? navigate('/dashboard') : setError(result.error);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card w-full max-w-md">
        <div className="text-center mb-4">
          <h1>Join NeighbourLink</h1>
          <p className="small mt-1">Create your account to connect with your community</p>
        </div>

        {error && <div className="card mb-4"><p className="text-red-700">{error}</p></div>}

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold mb-2">Username</label>
            <input className="input" name="username" value={formData.username} onChange={handleChange} required />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input className="input" type="email" name="email" value={formData.email} onChange={handleChange} required />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Address (optional)</label>
            <GooglePlacesAutocomplete onPlaceSelect={handlePlaceSelect} placeholder="Enter your address" />
            {addressData && (
              <p className="small mt-1">📍 {addressData.city}, {addressData.state}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Password</label>
            <input className="input" type="password" name="password" value={formData.password} onChange={handleChange} required />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Confirm password</label>
            <input className="input" type="password" name="password2" value={formData.password2} onChange={handleChange} required />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? 'Creating account…' : 'Register'}
          </button>
        </form>

        <p className="small text-center mt-4">
          Already have an account? <Link to="/login" className="underline">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
