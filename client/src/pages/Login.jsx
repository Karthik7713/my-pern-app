import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useTheme } from '../hooks/useTheme.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { colors } = useTheme();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) return setError('Email and password required');
    try {
      setLoading(true);
      const res = await login({ email, password });
      if (res.token) {
        navigate('/cashbook', { replace: true });
      } else {
        setError(res.error || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', background: colors.bg, color: colors.text, minHeight: '100vh' }}>
      <div style={{ maxWidth: 500, margin: '2rem auto' }}>
        <h2 style={{ color: colors.text, marginBottom: '1.5rem' }}>Login</h2>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, color: colors.text, fontWeight: 500 }}>Email</label>
            <input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="you@example.com" 
              style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 4, fontSize: 14 }} 
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, color: colors.text, fontWeight: 500 }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="password" 
              style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 4, fontSize: 14 }} 
            />
          </div>
          {error && <div style={{ color: 'red', marginBottom: 12, fontSize: 14 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <button 
              type="submit" 
              disabled={loading} 
              style={{ padding: '10px 16px', background: colors.buttonPrimary, color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
            >
              {loading ? 'Signing...' : 'Sign in'}
            </button>
            <Link to="/signup" style={{ padding: '10px 16px', background: colors.buttonSecondary, color: colors.text, textDecoration: 'none', borderRadius: 4, display: 'flex', alignItems: 'center', fontSize: 14 }}>
              Create account
            </Link>
            <button 
              type="button"
              onClick={() => navigate(-1)}
              style={{ padding: '10px 16px', background: colors.buttonSecondary, color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
            >
              Back
            </button>
          </div>
          <div>
            <Link to="/forgot-password" style={{ color: colors.buttonPrimary, textDecoration: 'none', fontSize: 14 }}>
              Forgot password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
