import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useTheme } from '../hooks/useTheme.jsx';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { colors } = useTheme();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    // Frontend validation
    if (!name) return setError('Name is required');
    if (!email) return setError('Email is required');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Please enter a valid email address');
    if (!password) return setError('Password is required');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirm) return setError('Passwords do not match');
    if (!secretCode) return setError('Secret code is required');
    try {
      setLoading(true);
      const res = await signup({ name, email, password, secretCode });
      if (res.token) navigate('/cashbook', { replace: true });
      else if (res.errors && Array.isArray(res.errors)) {
        // Show first backend validation error
        setError(res.errors[0].msg || 'Signup failed');
      } else if (res.error) {
        setError(res.error);
      } else {
        setError('Signup failed');
      }
    } catch (err) {
      // Show backend error message if available
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        setError(err.response.data.errors[0].msg || 'Signup failed');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Signup failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', background: colors.bg, color: colors.text, minHeight: '100vh' }}>
      <div style={{ maxWidth: 500, margin: '2rem auto' }}>
        <h2 style={{ color: colors.text, marginBottom: '1.5rem' }}>Sign up</h2>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, color: colors.text, fontWeight: 500 }}>Name</label>
            <input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 4, fontSize: 14 }} 
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, color: colors.text, fontWeight: 500 }}>Email</label>
            <input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 4, fontSize: 14 }} 
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, color: colors.text, fontWeight: 500 }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 4, fontSize: 14 }} 
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, color: colors.text, fontWeight: 500 }}>Confirm password</label>
            <input 
              type="password" 
              value={confirm} 
              onChange={(e) => setConfirm(e.target.value)} 
              style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 4, fontSize: 14 }} 
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, color: colors.text, fontWeight: 500 }}>Secret Code</label>
            <input 
              type="password" 
              value={secretCode} 
              onChange={(e) => setSecretCode(e.target.value)} 
              placeholder="Enter secret code"
              style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 4, fontSize: 14 }} 
            />
          </div>
          {error && <div style={{ color: 'red', marginBottom: 12, fontSize: 14 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              type="submit" 
              disabled={loading} 
              style={{ padding: '10px 16px', background: colors.buttonPrimary, color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
            >
              {loading ? 'Creating...' : 'Create account'}
            </button>
            <Link to="/login" style={{ padding: '10px 16px', background: colors.buttonSecondary, color: colors.text, textDecoration: 'none', borderRadius: 4, display: 'flex', alignItems: 'center', fontSize: 14 }}>
              Have an account?
            </Link>
            <button 
              type="button"
              onClick={() => navigate(-1)}
              style={{ padding: '10px 16px', background: colors.buttonSecondary, color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
            >
              Back
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
