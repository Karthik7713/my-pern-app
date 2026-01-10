import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { formatIndian, formatSignedIndian } from '../utils/format';
import { formatDateTimeSafe } from '../utils/datetime';
import { useAuth } from '../hooks/useAuth.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { useTheme } from '../hooks/useTheme.jsx';
import { useBooks } from '../hooks/bookContext';
import BookMembersModal from '../components/BookMembersModal.jsx';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const { user } = useAuth();
  const [toast, setToast] = useState(null);
  const { colors } = useTheme();

  const { activeBookId, selectBook, books } = useBooks();
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [membersModalBookId, setMembersModalBookId] = useState(null);
  const [membersModalBookName, setMembersModalBookName] = useState('');
  // Add-member UI state (inline near Dashboard title)
  const [_dmNewUserId, _dmSetNewUserId] = useState('');
  const [_dmNewUserLabel, _dmSetNewUserLabel] = useState('');
  const [_dmSuggestions, _dmSetSuggestions] = useState([]);
  const [_dmSearchQuery, _dmSetSearchQuery] = useState('');
  const [_dmShowSuggestions, _dmSetShowSuggestions] = useState(false);
  const [_dmSelectedRole, _dmSetSelectedRole] = useState('MEMBER');
  const [_dmAdding, _dmSetAdding] = useState(false);
  const [_dmError, _dmSetError] = useState(null);

  useEffect(() => {
    if (!_dmShowSuggestions) return;
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(_dmSearchQuery || '')}`);
        const list = res.data?.data || res.data || [];
        _dmSetSuggestions(list);
      } catch (err) {
        console.error('dashboard user search failed', err);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [_dmSearchQuery, _dmShowSuggestions]);

  const _dmHandleAdd = async () => {
    if (!activeBookId) return _dmSetError('Select a cashbook first');
    const uid = String(_dmNewUserId || '').trim();
    if (!uid) return _dmSetError('Select a user to add');
    _dmSetAdding(true); _dmSetError(null);
    try {
      await api.post(`/books/${activeBookId}/members`, { user_userid: uid, role: _dmSelectedRole });
      _dmSetNewUserId(''); _dmSetNewUserLabel(''); _dmSetShowSuggestions(false);
      // refresh dashboard summary which may include membership-aware data
      fetchSummary();
    } catch (err) {
      console.error('Dashboard add member failed', err);
      _dmSetError(err.response?.data?.error || 'Failed to add member');
    } finally { _dmSetAdding(false); }
  };

  const fetchSummary = async () => {
    try {
      setLoading(true);
      // Request a small limit for recent transactions to avoid heavy server-side windowing
      // If you need more rows, use the Reports page or the Transactions list with pagination.
      const bookQuery = activeBookId ? `&book_id=${encodeURIComponent(activeBookId)}` : '';
      const res = await api.get(`/dashboard/summary?limit=10${bookQuery}`);
      // Support both old shape (direct object) and new envelope { status, data }
      setSummary(res.data?.data ?? res.data);
    } catch (err) {
      // axios uses `err.response` when a server responded; when undefined it's a network-level error
      if (!err.response) {
        setIsNetworkError(true);
        setError('Network Error: Unable to reach API. Check the server or network connection.');
      } else {
        setIsNetworkError(false);
        setError(err.response?.data?.error || err.message || 'Failed to load dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  // fetchSummary is intentionally not listed in deps because we only want to refetch when activeBookId changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchSummary(); }, [activeBookId]);

  // Ensure that after login the user has an active book selected if they have any accessible books
  useEffect(() => {
    if (!activeBookId && Array.isArray(books) && books.length > 0) {
      try { selectBook(String(books[0].id)); } catch { /* ignore */ }
    }
  }, [activeBookId, books, selectBook]);

  if (loading) return <div style={{ padding: 20, background: colors.bg, color: colors.text, minHeight: '100vh' }}>Loading dashboard…</div>;
  if (error) return (
    <div style={{ padding: 20, color: 'red', background: colors.bg, minHeight: '100vh' }}>
      <div style={{ marginBottom: 12 }}>{error}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { setError(null); fetchSummary(); }} style={{ padding: '8px 12px', borderRadius: 6, background: colors.buttonPrimary, color: '#fff', border: 'none' }}>Retry</button>
        {isNetworkError && <button onClick={() => window.open('http://localhost:5000/api/ping','_blank')} style={{ padding: '8px 12px', borderRadius: 6, background: '#ef4444', color: '#fff', border: 'none' }}>Ping API</button>}
      </div>
    </div>
  );
  if (!summary) return <div style={{ padding: 20, background: colors.bg, color: colors.text, minHeight: '100vh' }}>No data available</div>;

  const currentBook = (books || []).find(x => String(x.id) === String(activeBookId));

  return (
    <div style={{ padding: 0, background: colors.bg, color: colors.text, minHeight: '100vh' }}>
      <div className="dashboard-top">
        <div className="dashboard-inner">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <h2 className="dashboard-title">{currentBook?.name || 'Dashboard'}</h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => {
                if (!activeBookId) return; const b = (books||[]).find(x => String(x.id) === String(activeBookId));
                setMembersModalBookId(activeBookId); setMembersModalBookName(b?.name || 'Members'); setMembersModalOpen(true);
              }} style={{ padding: '6px 10px', background: colors.buttonPrimary, color: '#fff', border: 'none', borderRadius: 6 }}>Members</button>
            </div>
          </div>

          <div className="summary-cards" role="region" aria-label="Summary cards">
            <div className="summary-card summary-card--in">
              <div className="summary-card__label">Cash In</div>
              <div className="summary-card__value">{formatIndian(summary.total_cash_in ?? 0)}</div>
            </div>
            <div className="summary-card summary-card--out">
              <div className="summary-card__label">Cash Out</div>
              <div className="summary-card__value">{formatIndian(summary.total_cash_out ?? 0)}</div>
            </div>
            <div className="summary-card summary-card--balance">
              <div className="summary-card__label">Balance</div>
              <div className="summary-card__value">{formatIndian(summary.balance ?? 0)}</div>
            </div>
          </div>
        </div>
      </div>
      <BookMembersModal open={membersModalOpen} onClose={() => setMembersModalOpen(false)} bookId={membersModalBookId} bookName={membersModalBookName} />

      <div className="dashboard-content-inner">
        <h3 style={{ color: colors.text, marginTop: 20 }}>Recent Transactions</h3>
        {!summary.recent || summary.recent.length === 0 ? (
          <p style={{ color: colors.textSecondary }}>No recent transactions</p>
        ) : (
          <div className="tx-list">
            {summary.recent.map(tx => {
            const currentBook = (books||[]).find(b => String(b.id) === String(activeBookId));
            const canEdit = (currentBook && String(currentBook.my_role) === 'OWNER') || (user && user.role === 'ADMIN');
            const isCashIn = tx.type === 'CASH_IN' || (tx.type || '').toUpperCase() === 'CASH_IN';
            const amountColor = isCashIn ? '#166534' : '#b91c1c';
            // Format amounts using Indian format. Do NOT compute balance client-side; use stored value if present.
            const displayAmount = formatSignedIndian(tx.amount ?? 0, isCashIn);
            const balanceVal = (tx.running_balance ?? tx.balance) != null ? formatIndian(tx.running_balance ?? tx.balance) : '-';
            const _fmt = formatDateTimeSafe(tx.timestamp || tx.created_at || tx.date);
            const d = tx.date_display || tx.created_at_date || _fmt.date;
            const time = tx.created_at_time || _fmt.time;
            const doneBy = tx.user_name || tx.done_by || tx.created_by || '-';

              return (
                <TransactionCard
                  key={tx.id}
                  tx={tx}
                  dtDate={d}
                  dtTime={time}
                  doneBy={doneBy}
                  displayAmount={displayAmount}
                  amountColor={amountColor}
                  balanceVal={balanceVal}
                  canEdit={canEdit}
                  onUpdate={(updated) => {
                    setSummary(s => ({ ...s, recent: s.recent.map(r => (r.id === updated.id ? { ...r, ...updated } : r)) }));
                  }}
                  onRemove={(id) => {
                    setSummary(s => ({ ...s, recent: s.recent.filter(r => r.id !== id) }));
                  }}
                  showToast={(t) => setToast(t)}
                />
              );
            })}
          </div>
        )}
      </div>
      {/* Toast area */}
      {toast && (
        <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 400 }}>
          <div style={{ background: '#111827', color: 'white', padding: 12, borderRadius: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div>{toast.message}</div>
            {toast.action && <button onClick={toast.action} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'white', padding: '6px 10px', borderRadius: 6 }}>{toast.actionLabel || 'Undo'}</button>}
          </div>
        </div>
      )}
    </div>
  );
}

/* TransactionCard component: contains card content, overflow menu, edit modal, delete+undo */
function TransactionCard({ tx, dtDate, dtTime, doneBy, displayAmount, amountColor, balanceVal, onUpdate, onRemove, showToast }) {
  // overflow menu removed — actions are available via other UI paths
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const doDelete = async () => {
    if (loading) return;
    setLoading(true);
    // optimistic remove
    onRemove(tx.id);
    let undoTimer = null;
    const undoAction = async () => {
      clearTimeout(undoTimer);
      try {
        await api.post(`/transactions/${tx.id}/restore`);
      } catch (e) {
        console.error('Restore failed', e);
        showToast && showToast({ message: 'Restore failed', action: null });
      }
    };

    showToast && showToast({ message: 'Transaction deleted', action: undoAction, actionLabel: 'Undo' });

    try {
      await api.delete(`/transactions/${tx.id}`);
      // start undo window: restore allowed via endpoint during this time
      undoTimer = setTimeout(() => { /* finalize: nothing to do, server already soft-deleted */ }, 6000);
    } catch {
      // on error, restore in UI
      onUpdate(tx); // simplistic: re-add via onUpdate (caller should re-fetch if needed)
      showToast && showToast({ message: 'Delete failed', action: null });
    } finally {
      setLoading(false);
    }
  };

  

      return (
        <div className="tx-card">
      {/* overflow button removed */}

      <div className="meta">
        <div className="dt">
          <div style={{ fontSize: 14, fontWeight: 600 }}>{dtDate}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{dtTime}</div>
        </div>
        <div className="by">Entry By: {doneBy}</div>
      </div>

        <div className="amounts">
        <div className="amount" style={{ color: amountColor }}>{displayAmount}</div>
        <div className="balance">Bal: {balanceVal}</div>
      </div>

      {/* menu intentionally removed; View/Edit/Delete actions are not shown here */}

      {/* Confirm modal for delete (replaces native confirm) */}
      <ConfirmModal
        open={deleteOpen}
        title="Delete Transaction"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async () => { setDeleteOpen(false); await doDelete(); }}
        confirmLabel="Delete"
      >
        <div>Are you sure you want to delete this transaction? This action cannot be undone.</div>
      </ConfirmModal>

      {editing && (
        <EditModal
          tx={tx}
          onClose={() => setEditing(false)}
          onSaved={(updated) => { onUpdate(updated); setEditing(false); showToast && showToast({ message: 'Saved' }); }}
        />
      )}
    </div>
  );
}

function EditModal({ tx, onClose, onSaved }) {
  const [date, setDate] = useState(tx.date ? tx.date.split('T')[0] : '');
  const todayISO = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const [amount, setAmount] = useState(tx.amount ?? '');
  const [description, setDescription] = useState(tx.description || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    if (!date) return setError('Date is required');
    if (new Date(date) > new Date(todayISO)) return setError('Date cannot be in the future');
    if (!amount || isNaN(Number(amount))) return setError('Amount must be a number');
    setSubmitting(true);
    try {
      const payload = { date, amount: Number(amount), description };
      const res = await api.put(`/transactions/${tx.id}`, payload);
      const updated = res.data.transaction || res.data;
      onSaved(updated);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to save');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.2)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <form onSubmit={handleSave} style={{ width: 'min(600px,95%)', background:'#fff', padding:20, borderRadius:8 }}>
        <h3>Edit Transaction</h3>
        <div style={{ marginBottom:12 }}>
          <label style={{ display:'block', fontSize:12 }}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} max={todayISO} style={{ width:'100%', padding:8, border:'1px solid #ccc', borderRadius:4 }} />
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={{ display:'block', fontSize:12 }}>Amount</label>
          <input value={amount} onChange={e => setAmount(e.target.value)} style={{ width:'100%', padding:8, border:'1px solid #ccc', borderRadius:4 }} />
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={{ display:'block', fontSize:12 }}>Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)} style={{ width:'100%', padding:8, border:'1px solid #ccc', borderRadius:4 }} />
        </div>
        {error && <div style={{ color:'red', marginBottom:12 }}>{error}</div>}
        <div style={{ display:'flex', gap:12, justifyContent:'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding:'8px 12px', background:'#ccc', border:'none', borderRadius:6 }}>Cancel</button>
          <button type="submit" disabled={submitting} style={{ padding:'8px 12px', background:'#111827', color:'#fff', border:'none', borderRadius:6 }}>{submitting ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}
