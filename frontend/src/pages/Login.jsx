import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(formData);
    result.success ? navigate('/dashboard') : setError(result.error);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card w-full max-w-md">
        <div className="text-center mb-4">
          <h1>Welcome back</h1>
          <p className="small mt-1">Login to your NeighbourLink account</p>
        </div>

        {error && <div className="card mb-4"><p className="text-red-700">{error}</p></div>}

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input
              className="input"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Password</label>
            <input
              className="input"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <p className="small text-center mt-4">
          Don’t have an account?{' '}
          <Link to="/register" className="underline">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
