import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useTheme } from '../hooks/useTheme.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login, setUser } = useAuth();
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
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={async () => {
                setError(null);
                // ensure no stale token/user remain before attempting admin login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
                // require entering the admin secret code to proceed
                const code = window.prompt('Enter admin secret code to authenticate as ADMIN');
                if (!code) return setError('Admin secret code required');
                setLoading(true);
                try {
                  // Prompt for admin email and password to require explicit credentials
                  const adminEmail = window.prompt('Admin email', 'mkarthikreddy7713@gmail.com');
                  if (!adminEmail) return setError('Admin email required');
                  const adminPassword = window.prompt('Admin password');
                  if (!adminPassword) return setError('Admin password required');
                  const res = await login({ email: adminEmail, password: adminPassword, secretCode: code });
                  // require server to explicitly return an ADMIN user
                  if (res && res.token && res.user && String(res.user.role).toUpperCase() === 'ADMIN') {
                    navigate('/cashbook', { replace: true });
                  } else {
                    // cleanup any partial auth state
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setUser(null);
                    setError(res?.error || 'Admin login failed: server did not return ADMIN');
                  }
                } catch (err) {
                  // cleanup on unexpected error
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  setUser(null);
                  setError(err.response?.data?.error || err.message || 'Admin login failed');
                } finally {
                  setLoading(false);
                }
              }}
              style={{ padding: '8px 12px', background: colors.buttonSecondary, color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
            >
              Log in as Admin
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
