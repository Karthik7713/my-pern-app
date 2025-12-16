import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import { useTheme } from '../hooks/useTheme.jsx';

export default function BookMembersModal({ bookId, bookName, open, onClose }) {
  const { colors } = useTheme();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newUserLabel, setNewUserLabel] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedRole, setSelectedRole] = useState('MEMBER');
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refreshMembers = useCallback(async () => {
    try {
      const res = await api.get(`/books/${bookId}/members`);
      let list = res.data?.data?.members || res.data?.members || [];

      // find members without a readable name (or where label is numeric id) and fetch user names in batch
      const missingIds = Array.from(new Set(list
        .map(m => ({ id: String(m.user_userid || m.user_id || ''), label: (m.name || m.user_name || m.display_name || m.email || String(m.user_userid || m.user_id || '')) }))
        .filter(x => x.id && (!x.label || /^[0-9]+$/.test(String(x.label).trim())))
        .map(x => x.id)
      ));

      if (missingIds.length) {
        try {
          const ures = await api.get(`/users/batch?ids=${missingIds.join(',')}`);
          const users = ures.data?.data || ures.data || [];
          const map = new Map(users.map(u => [String(u.id), u]));
          list = list.map(m => {
            const id = String(m.user_userid || m.user_id || '');
            const u = map.get(id);
            if (u) return { ...m, name: u.name, email: u.email };
            return m;
          });
        } catch (err) {
          console.warn('batch user fetch failed', err);
        }
      }

      setMembers(list);
    } catch (err) {
      console.error('Failed to refresh members', err);
    }
  }, [bookId]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await refreshMembers();
      } catch (err) {
        console.error('Failed to load members', err);
        setError('Failed to load members');
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();
  }, [open, bookId, refreshMembers]);

  // suggestions fetch (debounced)
  useEffect(() => {
    if (!showSuggestions) return;
    const t = setTimeout(() => {
      (async () => {
        try {
          const res = await api.get(`/users/search?q=${encodeURIComponent(searchQuery || '')}`);
          // API returns array of users
          const list = res.data?.data || res.data || [];
          setSuggestions(list);
        } catch (err) {
          console.error('user search failed', err);
        }
      })();
    }, 220);
    return () => clearTimeout(t);
  }, [searchQuery, showSuggestions]);

  

  const handleAdd = async () => {
    const uid = String(newUserId || '').trim();
    if (!uid) return setError('Select a user to add');
    setAdding(true); setError(null);
    try {
      await api.post(`/books/${bookId}/members`, { user_userid: uid, role: selectedRole });
      await refreshMembers();
      setNewUserId('');
      setNewUserLabel('');
      setShowSuggestions(false);
    } catch (err) {
      console.error('Add member failed', err);
      setError(err.response?.data?.error || 'Failed to add member');
    } finally { if (mountedRef.current) setAdding(false); }
  };

  const handleRemove = async (uid) => {
    try {
      await api.delete(`/books/${bookId}/members/${encodeURIComponent(uid)}`);
      setMembers(m => m.filter(x => String(x.user_userid || x.user_id) !== String(uid)));
    } catch (err) {
      console.error('Remove member failed', err);
      setError(err.response?.data?.error || 'Failed to remove');
    }
  };

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.24)', zIndex:4000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ width:'min(760px,94%)', background: colors.bgSecondary, color: colors.text, borderRadius:8, padding:16 }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <h3 style={{ margin:0 }}>{bookName || 'Members'}</h3>
          <button aria-label="Close members modal" onClick={onClose} style={{ background:'transparent', border:'none', color:colors.text, cursor:'pointer', fontSize:18 }}>✕</button>
        </div>

        {error && <div style={{ background:'#fee2e2', color:'#b91c1c', padding:8, borderRadius:6, marginBottom:8 }}>{error}</div>}

        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:13, color:colors.textSecondary, marginBottom:6 }}>Members</div>
          {loading ? <div>Loading…</div> : (
            <ul style={{ listStyle:'none', padding:0, margin:0 }}>
              {members.map(m => {
                const label = m.name || m.user_name || m.display_name || m.email || (m.user_userid || m.user_id);
                return (
                  <li key={String(m.user_userid || m.user_id)} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
                    <div>
                      <div style={{ fontWeight:600 }}>{label}</div>
                      <div style={{ fontSize:12, color:colors.textSecondary }}>Role: {m.role || 'MEMBER'}</div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <button onClick={() => handleRemove(m.user_userid || m.user_id)} style={{ background:'#b91c1c', color:'#fff', border:'none', padding:'6px 8px', borderRadius:6, cursor:'pointer' }}>Remove</button>
                    </div>
                  </li>
                );
              })}
              {members.length === 0 && <li style={{ color: colors.textSecondary }}>No members</li>}
            </ul>
          )}
        </div>

        <div style={{ position: 'relative', display:'flex', gap:8, alignItems:'center' }}>
          <input
            placeholder="Search users by name or email"
            value={newUserLabel}
            onChange={e=>{ setSearchQuery(e.target.value); setNewUserId(''); setNewUserLabel(e.target.value); setShowSuggestions(true); }}
            onFocus={() => { setShowSuggestions(true); setSearchQuery(''); }}
            style={{ flex:1, padding:8, border:`1px solid ${colors.border}`, borderRadius:6, background:colors.input, color:colors.text }}
          />

          <select value={selectedRole} onChange={e=>setSelectedRole(e.target.value)} style={{ marginLeft:8, padding:8, border:`1px solid ${colors.border}`, borderRadius:6, background:colors.input, color:colors.text }}>
            <option value="MEMBER">Member</option>
            <option value="OWNER">Owner</option>
          </select>

          <button onClick={handleAdd} disabled={adding} style={{ padding:'8px 12px', marginLeft:8, background:colors.buttonPrimary, color:'#fff', border:'none', borderRadius:6 }}>{adding ? 'Adding…' : 'Add'}</button>

          {showSuggestions && suggestions && suggestions.length > 0 && (
            <div style={{ position: 'absolute', left: 0, right: 120, top: '100%', background: colors.bgSecondary, border: `1px solid ${colors.border}`, borderRadius: 6, marginTop: 6, zIndex: 600, maxHeight: 220, overflow: 'auto' }}>
              {suggestions.map(u => (
                <div key={u.id} onMouseDown={(e)=>{ e.preventDefault(); setNewUserId(u.id); setNewUserLabel(u.name || u.email); setShowSuggestions(false); }} style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <div style={{ fontWeight: 600 }}>{u.name || u.email}</div>
                  <div style={{ fontSize: 12, color: colors.textSecondary }}>{u.email}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
