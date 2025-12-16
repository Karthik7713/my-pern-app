import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useTheme } from '../hooks/useTheme.jsx';
import api from '../services/api';

export default function AdminPanel() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'users' && user?.role === 'ADMIN') fetchUsers();
  }, [tab, user]);

  if (!user) return <div style={{ padding: 20, background: colors.bg, color: colors.text, minHeight: '100vh' }}>Loading user info...</div>;
  if (user.role !== 'ADMIN') return <div style={{ padding: 20, color: 'red', background: colors.bg, minHeight: '100vh' }}>⛔ Access Denied - Admin only</div>;

  const toggleUserStatus = async (userId, newStatus) => {
    try {
      await api.put(`/admin/users/${userId}/status`, { is_active: newStatus });
      fetchUsers();
    } catch {
      alert('Failed to update user status');
    }
  };

  return (
    <div style={{ padding: 20, background: colors.bg, color: colors.text, minHeight: '100vh' }}>
      <h2 style={{ color: colors.text }}>Admin Panel</h2>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <button onClick={() => setTab('users')} style={{ background: tab === 'users' ? '#111827' : '#ccc', color: tab === 'users' ? 'white' : 'black', padding: '8px 12px', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Users</button>
        <button onClick={() => setTab('auditlogs')} style={{ background: tab === 'auditlogs' ? '#111827' : '#ccc', color: tab === 'auditlogs' ? 'white' : 'black', padding: '8px 12px', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Audit Logs</button>
      </div>

      {tab === 'users' && (
        <div>
          {loading ? <p style={{ color: colors.textSecondary }}>Loading...</p> : error ? <p style={{ color: 'red' }}>{error}</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: colors.bgSecondary, color: colors.text }}>
                  <th style={{ padding: 8 }}>Name</th><th style={{ padding: 8 }}>Email</th><th style={{ padding: 8 }}>Role</th><th style={{ padding: 8 }}>Status</th><th style={{ padding: 8 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${colors.border}`, color: colors.text }}>
                    <td style={{ padding: 8 }}>{u.name}</td>
                    <td style={{ padding: 8 }}>{u.email}</td>
                    <td style={{ padding: 8 }}>{u.role}</td>
                    <td style={{ padding: 8 }}>{u.is_active ? 'Active' : 'Inactive'}</td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => toggleUserStatus(u.id, !u.is_active)} style={{ padding: '4px 8px', background: '#111827', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem' }}>
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'auditlogs' && (
        <div>
          <p style={{ color: '#666' }}>Audit logs feature (to be implemented)</p>
        </div>
      )}
    </div>
  );
}
