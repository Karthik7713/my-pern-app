import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useTheme } from '../hooks/useTheme.jsx';
import api from '../services/api';

export default function Settings() {
  const { user, setUser } = useAuth();
  const { colors, toggleTheme } = useTheme();
  // default values when no user data available
  const [name, setName] = useState('name');
  const [email, setEmail] = useState('gmanil');
  const [currency, setCurrency] = useState('USD');
  const [theme, setTheme] = useState('light');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setCurrency(user.currency_preference || 'USD');
      setTheme(user.theme_preference || 'light');
    }
  }, [user]);

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const res = await api.put('/users/me', { name, email, currency_preference: currency, theme_preference: theme });
      // server returns envelope { status, data }, normalize to store the actual user object
      setUser(res.data?.data ?? res.data);
      toggleTheme(theme);
      setMessage('Profile updated');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirm) return setError('Passwords do not match');
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      await api.put('/users/me/password', { currentPassword, newPassword });
      setMessage('Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page" style={{ padding: 12, maxWidth: 600, background: colors.bg, color: colors.text }}>
      <h2 style={{ color: colors.text }}>Settings</h2>
      {message && <div style={{ background: '#dcfce7', color: '#166534', padding: 8, borderRadius: 4, marginBottom: 16 }}>{message}</div>}
      {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 8, borderRadius: 4, marginBottom: 16 }}>{error}</div>}

      <h3 style={{ color: colors.text, marginTop: 0 }}>Profile</h3>
      <form onSubmit={updateProfile}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, color: colors.text, fontWeight: 500 }}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: 8, border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.input, color: colors.text }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, color: colors.text, fontWeight: 500 }}>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: 8, border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.input, color: colors.text }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, color: colors.text, fontWeight: 500 }}>Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ width: '100%', padding: 8, border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.input, color: colors.text }}>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="INR">INR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, color: colors.text, fontWeight: 500 }}>Theme</label>
          <select value={theme} onChange={(e) => setTheme(e.target.value)} style={{ width: '100%', padding: 8, border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.input, color: colors.text }}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <button type="submit" disabled={loading} style={{ padding: '8px 16px', background: colors.buttonPrimary, color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Save Profile</button>
      </form>

      <h3 style={{ marginTop: 24, color: colors.text }}>Change Password</h3>
      <form onSubmit={changePassword}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, color: colors.text, fontWeight: 500 }}>Current Password</label>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={{ width: '100%', padding: 8, border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.input, color: colors.text }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, color: colors.text, fontWeight: 500 }}>New Password</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: '100%', padding: 8, border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.input, color: colors.text }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, color: colors.text, fontWeight: 500 }}>Confirm Password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={{ width: '100%', padding: 8, border: `1px solid ${colors.border}`, borderRadius: 4, background: colors.input, color: colors.text }} />
        </div>
        <button type="submit" disabled={loading} style={{ padding: '8px 16px', background: colors.buttonPrimary, color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Change Password</button>
      </form>
    </div>
  );
}
