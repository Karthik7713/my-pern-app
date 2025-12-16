import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useTheme } from '../hooks/useTheme.jsx';

export default function Profile() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const navigate = useNavigate();

  if (!user) return (
    <div style={{ padding: 20, background: colors.bg, color: colors.text, minHeight: '100vh' }}>
      <p style={{ color: colors.textSecondary }}>No user data available. You may need to log in.</p>
    </div>
  );

  return (
    <div style={{ padding: 20, background: colors.bg, color: colors.text, minHeight: '100vh' }}>
      <h2 style={{ marginTop: 0, color: colors.text }}>Profile</h2>

      <div style={{ maxWidth: 700, background: colors.bgSecondary, padding: 16, borderRadius: 8 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: colors.textSecondary }}>Name</div>
          <div style={{ fontWeight: 700, color: colors.text }}>{user.name || '-'}</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: colors.textSecondary }}>Email</div>
          <div style={{ fontWeight: 700, color: colors.text }}>{user.email || '-'}</div>
        </div>

        <div style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: colors.textSecondary }}>Currency</div>
            <div style={{ fontWeight: 700, color: colors.text }}>{user.currency_preference || '-'}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: colors.textSecondary }}>Theme</div>
            <div style={{ fontWeight: 700, color: colors.text }}>{user.theme_preference || '-'}</div>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: colors.textSecondary }}>Role</div>
          <div style={{ fontWeight: 700, color: colors.text }}>{user.role || '-'}</div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={() => navigate('/settings')} style={{ padding: '8px 12px', background: colors.buttonPrimary, color: 'white', border: 'none', borderRadius: 6 }}>Edit Profile</button>
          <Link to="/" style={{ padding: '8px 12px', background: 'transparent', color: colors.text, textDecoration: 'none' }}>Close</Link>
        </div>

        {/* Debug info removed: do not expose raw user object (contained id) in profile UI */}
      </div>
    </div>
  );
}
