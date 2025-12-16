import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from '../hooks/useTheme.jsx';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { useBooks } from '../hooks/bookContext';
import { useAuth } from '../hooks/useAuth.jsx';

/* ---------------- helpers ---------------- */
const IN = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function formatIndian(n) {
  const num = Number(n ?? 0);
  return isFinite(num) ? IN.format(num) : '-';
}
function formatDateTimeSafe(input) {
  const toTwo = (v) => String(v).padStart(2, '0');
  const parseToDate = (inp) => {
    if (!inp) return new Date();
    if (inp instanceof Date) return inp;
    if (typeof inp === 'number') return new Date(inp);
    let s = String(inp).trim();

    const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?(?:Z)?$/);
    if (m) {
      const datePart = m[1];
      const timePart = m[2];
      let frac = m[3] || '';
      if (frac.length > 3) frac = frac.slice(0, 3);
      while (frac.length < 3) frac = frac + '0';
      s = `${datePart}T${timePart}${frac ? '.' + frac : ''}`;
    }

    let d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      const n = Number(s);
      if (!Number.isNaN(n)) {
        d = n < 1e12 ? new Date(n * 1000) : new Date(n);
      } else {
        d = new Date();
      }
    }
    return d;
  };

  const d = parseToDate(input);
  const dd = toTwo(d.getDate()), mm = toTwo(d.getMonth() + 1), yyyy = d.getFullYear();
  const hours = d.getHours(), mins = toTwo(d.getMinutes()), secs = toTwo(d.getSeconds());
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return { date: `${dd}/${mm}/${yyyy}`, time: `${toTwo(hour12)}:${mins}:${secs} ${hours >= 12 ? 'PM' : 'AM'}` };
}

/* --------------- TransactionMenu (View/Edit/Delete) --------------- */
function TransactionMenu({ onView, onEdit, onDelete, accentColor = '#111827', canEdit = true, onDisabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        style={{ background: accentColor, color: '#fff', border: 'none', fontSize: 16, padding: 6, borderRadius: 8, cursor: 'pointer' }}
        title="Actions"
      >
        ⋮
      </button>

      {open && (
        <div role="menu" style={{ position: 'absolute', right: 0, top: 36, background: '#6b7280', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 40 }}>
          <button
            role="menuitem"
            onClick={() => { setOpen(false); onView && onView(); }}
            style={{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600, textAlign: 'left' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            View
          </button>

          <button
            role="menuitem"
            onClick={() => { setOpen(false); if (canEdit) { onEdit && onEdit(); } else { onDisabled && onDisabled('edit'); } }}
            style={{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', color: '#fff', cursor: canEdit ? 'pointer' : 'not-allowed', fontWeight: 600, textAlign: 'left', opacity: canEdit ? 1 : 0.6 }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Edit
          </button>

          <button
            role="menuitem"
            onClick={() => { setOpen(false); if (canEdit) { onDelete && onDelete(); } else { onDisabled && onDisabled('delete'); } }}
            style={{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', color: '#fff', cursor: canEdit ? 'pointer' : 'not-allowed', fontWeight: 600, textAlign: 'left', borderBottomLeftRadius: 6, borderBottomRightRadius: 6, opacity: canEdit ? 1 : 0.6 }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- ViewModal (read-only) ---------------- */
function ViewModal({ tx, onClose }) {
  if (!tx) return null;
  const _fmtView = formatDateTimeSafe(tx.timestamp || tx.created_at || tx.date);
  const d = tx.date_display || tx.created_at_date || _fmtView.date;
  const time = tx.created_at_time || _fmtView.time;
  const amt = formatIndian(tx.amount ?? tx.cash_in ?? tx.cash_out ?? 0);
  const isCashIn = String(tx.type || '').toUpperCase() === 'CASH_IN';
  return (
    <div style={{ position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.2)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:'min(700px,95%)', background:'#fff', borderRadius:8, padding:20 }}>
        <h3 style={{ marginTop:0 }}>Transaction Details</h3>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <div style={{ fontSize:12, color:'#666' }}>Date</div>
            <div style={{ fontWeight:600 }}>{d}</div>
            <div style={{ fontSize:12, color:'#666', marginTop:6 }}>Time</div>
            <div>{time}</div>
          </div>

          <div>
            <div style={{ fontSize:12, color:'#666' }}>Amount</div>
            <div style={{ fontWeight:700, color: '#0f1724' }}>{isCashIn ? `+${amt}` : `-${amt}`}</div>

            <div style={{ fontSize:12, color:'#666', marginTop:6 }}>Type</div>
            <div style={{ fontWeight:600 }}>{tx.type}</div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize:12, color:'#666' }}>Description</div>
            <div>{tx.description || '-'}</div>

            <div style={{ fontSize:12, color:'#666', marginTop:6 }}>Category</div>
            <div>{tx.category || '-'}</div>

            <div style={{ fontSize:12, color:'#666', marginTop:6 }}>Done By</div>
            <div>{tx.user_name || tx.created_by || '-'}</div>
          </div>
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
          <button onClick={onClose} style={{ padding:'8px 12px', background:'#111827', color:'#fff', border:'none', borderRadius:6 }}>Close</button>
        </div>
      </div>

      {/* Confirm modal removed from ViewModal (rendered from Transactions instead) */}
      </div>
        );
    }

    export default function Transactions() {
      const { activeBookId, books } = useBooks();
      const { user } = useAuth();
      const [toast, setToast] = useState(null);
      const [previewUrl, setPreviewUrl] = useState(null);
      const [previewOpen, setPreviewOpen] = useState(false);
      const [previewType, setPreviewType] = useState('');
      const clickTimerRef = useRef(null);
      const [previewName, setPreviewName] = useState('');

      useEffect(() => {
        if (!previewOpen) return;
        const onKey = (e) => { if (e.key === 'Escape') setPreviewOpen(false); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
      }, [previewOpen]);

      // auto-hide toast
      useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(t);
      }, [toast]);

      const currentBook = (books||[]).find(b => String(b.id) === String(activeBookId));
      const canEdit = (currentBook && String(currentBook.my_role) === 'OWNER') || (user && user.role === 'ADMIN');
      const API_ROOT = (() => {
        try { return (api.defaults.baseURL || '').replace(/\/api\/?$/i, ''); } catch { return ''; }
      })();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const [hasMore, setHasMore] = useState(false);

  // form state
  const todayISO = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const [date, setDate] = useState(todayISO);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('CASH_OUT');
  const [attachment, setAttachment] = useState(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  // edit/view state
  const [editTx, setEditTx] = useState(null);
  const [viewTx, setViewTx] = useState(null);

  const fileInputRef = useRef(null);

  // responsive: mobile card layout for small widths
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 720 : false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 720);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // load transactions
  const loadTransactions = useCallback(async (p = 0) => {
    try {
      setLoading(true);
      setError(null);
      const offset = p * pageSize;
      // scope to active book if set
      const bookParam = activeBookId ? `&book_id=${encodeURIComponent(activeBookId)}` : '';
      const res = await api.get(`/transactions?limit=${pageSize}&offset=${offset}${bookParam}`);
      const rowsData = res.data?.data?.rows ?? res.data?.rows ?? res.data;
      setRows(Array.isArray(rowsData) ? rowsData : []);
      setHasMore(Array.isArray(rowsData) ? rowsData.length === pageSize : false);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeBookId, pageSize]);
  useEffect(() => { loadTransactions(page); }, [page, loadTransactions]);

  // Confirm flow: show modal with details, then perform creation only on confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  // delete confirmation (replace native browser confirm)
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTxId, setDeleteTxId] = useState(null);

  const performCreateTransaction = async (payload) => {
    setMessage(null);
    if (!payload.date || !payload.amount) return setMessage('Date and amount required');
    try {
      setSubmitting(true);
      const postBody = { date: payload.date, amount: Number(payload.amount), type: payload.type, description: payload.description, category: payload.category };
      if (activeBookId) postBody.book_id = activeBookId;
      const res = await api.post('/transactions', postBody);
      // normalize created transaction object from possible response shapes
      const created = res?.data?.data?.transaction ?? res?.data?.data ?? res?.data?.transaction ?? res?.data;
      const transactionId = created?.id;
      if (payload.attachment && transactionId) {
        const fd = new FormData(); fd.append('receipt', payload.attachment);
        try {
          await api.post(`/transactions/${transactionId}/upload-receipt`, fd);
        } catch (u) {
          console.error(u);
          setMessage('Created but upload failed');
        }
      }
      setMessage('Transaction created');
      setDate(todayISO); setAmount(''); setType('CASH_OUT'); setAttachment(null); setDescription(''); setCategory('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadTransactions();
    } catch (err) {
      setMessage(err?.response?.data?.error || err?.message || 'Failed to create');
    } finally { setSubmitting(false); }
  };

  const createTransaction = (e) => {
    e.preventDefault();
    setMessage(null);
    if (!date || !amount) return setMessage('Date and amount required');
    const payload = { date, amount, type, description, category, attachment };
    setPendingPayload(payload);
    setMessage('Please confirm transaction details');
    setConfirmOpen(true);
  };

  const requestDelete = (id) => {
    setDeleteTxId(id);
    setDeleteOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/transactions/${id}`);
      await loadTransactions();
      return true;
    } catch (err) {
      console.error('delete failed', err);
      setToast && setToast({ message: 'Delete failed' });
      return false;
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTx) return;
    try {
      await api.put(`/transactions/${editTx.id}`, editTx);
      setEditTx(null);
      await loadTransactions();
    } catch {
      setToast && setToast({ message: 'Update failed' });
    }
  };

  /* ---------- rendering ---------- */
  const tableStyles = { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '0.95rem' };
  const thStyle = { padding: '6px 6px', textAlign: 'left', background: '#f3f4f6' };
  const tdCompact = { padding: '6px 6px', verticalAlign: 'top', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

  const { colors } = useTheme();

  return (
    <div style={{ padding: 20, background: colors.bg, color: colors.text, minHeight: '100vh' }}>
      <h2 style={{ color: colors.text }}>Transactions</h2>

      {/* --- create form (date input has max=todayISO to block future dates) --- */}
      <form onSubmit={createTransaction} style={{ maxWidth: 960 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 160px', minWidth: 140 }}>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} max={todayISO} style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />
          </div>

          <div style={{ flex: '1 1 160px', minWidth: 140 }}>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Amount</label>
            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />
          </div>

          <div style={{ flex: '1 1 120px', minWidth: 120 }}>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Type</label>
            <select value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}>
              <option value="CASH_OUT">Cash Out</option>
              <option value="CASH_IN">Cash In</option>
            </select>
          </div>

          {/* Description & Category fields added (not shown in table) */}
          <div style={{ flex: '1 1 220px', minWidth: 160 }}>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Enter description" style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />
          </div>

          <div style={{ flex: '1 1 160px', minWidth: 140 }}>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Category</label>
            <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Enter category" style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Attachment</label>
          <input id="attachmentInput" ref={fileInputRef} type="file" onChange={e => setAttachment(e.target.files[0])} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
        </div>

        <div style={{ marginTop: 10 }}>
          <button type="submit" disabled={submitting} style={{ padding: '8px 14px', background: '#111827', color: '#fff', border: 'none', borderRadius: 4 }}>
            {submitting ? 'Saving...' : 'Add Transaction'}
          </button>
          {message && <span style={{ marginLeft: 12 }}>{message}</span>}
        </div>
      </form>

      {/* --- content --- */}
      <div style={{ marginTop: 18 }}>
        {loading ? <p style={{ color: '#666' }}>Loading…</p> : error ? <p style={{ color: 'red' }}>{error}</p> : (!Array.isArray(rows) || rows.length === 0) ? <p style={{ color: '#666' }}>No transactions yet</p> : (
          isMobile ? (
            /* mobile stacked cards */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rows.map(r => {
                const _fmt = formatDateTimeSafe(r.timestamp || r.created_at || r.date);
                const d = r.date_display || r.created_at_date || _fmt.date;
                const time = r.created_at_time || _fmt.time;
                const amt = formatIndian(r.amount ?? r.cash_in ?? r.cash_out ?? 0);
                const isCashIn = String(r.type || '').toUpperCase() === 'CASH_IN';
                const bg = isCashIn ? '#eaffef' : '#fff0f0';
                const border = isCashIn ? '#bbf7d0' : '#fecaca';
                const amountColor = isCashIn ? '#166534' : '#b91c1c';
                const accentBtn = isCashIn ? '#16a34a' : '#dc2626';

                const receiptUrl = r.receipt_path ? (String(r.receipt_path).startsWith('http') ? r.receipt_path : `${API_ROOT}/${String(r.receipt_path).replace(/^\/+/, '')}`) : null;

                return (
                  <div key={r.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{d}</div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{time}</div>
                      <div style={{ marginTop: 8, fontSize: 13, color: '#333' }}>Entry By: <span style={{ fontWeight: 600 }}>{r.user_name || r.created_by || '-'}</span></div>
                      {/* description & category are not shown in list per your request */}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <div style={{ fontWeight: 700, color: amountColor, fontSize: 16 }}>{isCashIn ? `+${amt}` : `-${amt}`}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {receiptUrl && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              // detect double click: cancel timer -> download
                              if (clickTimerRef.current) {
                                clearTimeout(clickTimerRef.current);
                                clickTimerRef.current = null;
                                (async () => {
                                  try {
                                    const res = await fetch(receiptUrl);
                                    const blob = await res.blob();
                                    const name = receiptUrl.split('/').pop().split('?')[0];
                                    const u = URL.createObjectURL(blob);
                                    const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u);
                                  } catch { setToast({ message: 'Download failed' }); }
                                })();
                              } else {
                                clickTimerRef.current = setTimeout(() => {
                                  clickTimerRef.current = null;
                                  // open preview
                                  const lower = String(receiptUrl).toLowerCase();
                                  if (lower.endsWith('.pdf')) setPreviewType('pdf');
                                  else if (lower.match(/\.(jpg|jpeg|png|gif|bmp)$/)) setPreviewType('image');
                                  else setPreviewType('other');
                                  setPreviewUrl(receiptUrl);
                                  setPreviewName(receiptUrl.split('/').pop().split('?')[0] || 'attachment');
                                  setPreviewOpen(true);
                                }, 260);
                              }
                            }}
                            title="Open (single) / Download (double)"
                            style={{ border: 'none', background: 'transparent', padding: 0, margin: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.04)' }}
                          >
                            📎
                          </button>
                        )}
                        <TransactionMenu
                          onView={() => setViewTx(r)}
                          onEdit={() => setEditTx(r)}
                          onDelete={() => requestDelete(r.id)}
                          accentColor={accentBtn}
                          canEdit={canEdit}
                          onDisabled={(type) => setToast({ message: type === 'edit' ? 'Only owner may edit transactions' : 'Only owner may delete transactions' })}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* desktop compact table */
            <div style={{ width: '100%', overflowX: 'hidden' }}>
              <table style={tableStyles}>
                <colgroup>
                  <col style={{ width: '40%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '5%' }} />
                </colgroup>

                <thead>
                  <tr>
                    <th style={thStyle}>Date</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                    <th style={thStyle}>Done By</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}></th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map(r => {
                    const _fmt = formatDateTimeSafe(r.timestamp || r.created_at || r.date);
                    const d = r.date_display || r.created_at_date || _fmt.date;
                    const time = r.created_at_time || _fmt.time;
                    const amt = formatIndian(r.amount ?? r.cash_in ?? r.cash_out ?? 0);
                    const isCashIn = String(r.type || '').toUpperCase() === 'CASH_IN';
                    const bg = isCashIn ? 'rgba(220,253,231,0.6)' : 'rgba(254,226,226,0.6)';
                    const border = isCashIn ? '#bbf7d0' : '#fecaca';
                    const amountColor = isCashIn ? '#166534' : '#b91c1c';
                    const accentBtn = isCashIn ? '#16a34a' : '#dc2626';

                    return (
                      <tr key={r.id} style={{ background: bg, borderBottom: `1px solid ${border}` }}>
                        <td style={{ ...tdCompact, whiteSpace: 'normal' }}>
                          <div style={{ fontSize: 14, color: '#111' }}>{d}</div>
                          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{time}</div>
                        </td>

                        <td style={{ ...tdCompact, textAlign: 'right', color: amountColor, fontWeight: 700 }}>{isCashIn ? `+${amt}` : `-${amt}`}</td>

                        <td style={{ ...tdCompact, whiteSpace: 'normal' }}>{r.user_name || r.created_by || '-'}</td>

                        <td style={{ ...tdCompact, textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            {r.receipt_path && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  const url = (String(r.receipt_path).startsWith('http') ? r.receipt_path : `${API_ROOT}/${String(r.receipt_path).replace(/^\/+/, '')}`);
                                  if (clickTimerRef.current) {
                                    clearTimeout(clickTimerRef.current);
                                    clickTimerRef.current = null;
                                    (async () => {
                                      try {
                                        const res = await fetch(url);
                                        const blob = await res.blob();
                                        const name = url.split('/').pop().split('?')[0];
                                        const u = URL.createObjectURL(blob);
                                        const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u);
                                      } catch { setToast({ message: 'Download failed' }); }
                                    })();
                                  } else {
                                    clickTimerRef.current = setTimeout(() => {
                                      clickTimerRef.current = null;
                                      const lower = String(url).toLowerCase();
                                      if (lower.endsWith('.pdf')) setPreviewType('pdf');
                                      else if (lower.match(/\.(jpg|jpeg|png|gif|bmp)$/)) setPreviewType('image');
                                      else setPreviewType('other');
                                      setPreviewUrl(url);
                                      setPreviewName(url.split('/').pop().split('?')[0] || 'attachment');
                                      setPreviewOpen(true);
                                    }, 260);
                                  }
                                }}
                                title="Open (single) / Download (double)"
                                style={{ border: 'none', background: 'transparent', padding: 0, margin: 0, cursor: 'pointer', textDecoration: 'none', color: '#111' }}
                              >
                                <span style={{ display: 'inline-block', width: 22, height: 22, borderRadius: 6, background: 'rgba(0,0,0,0.04)', textAlign: 'center', lineHeight: '22px' }}>📎</span>
                              </button>
                            )}
                            <TransactionMenu
                              onView={() => setViewTx(r)}
                              onEdit={() => setEditTx(r)}
                              onDelete={() => requestDelete(r.id)}
                              accentColor={accentBtn}
                              canEdit={canEdit}
                              onDisabled={(type) => setToast({ message: type === 'edit' ? 'Only owner may edit transactions' : 'Only owner may delete transactions' })}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
        {/* pagination controls */}
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text }}>Prev</button>
          <div style={{ alignSelf: 'center' }}>Page {page + 1}</div>
          <button onClick={() => setPage(p => p + 1)} disabled={!hasMore} style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text }}>Next</button>
        </div>
      </div>
      {/* ---------- CONFIRM modal for creating transaction ---------- */}
      <ConfirmModal
        open={confirmOpen}
        title="Confirm Transaction"
        onCancel={() => { setConfirmOpen(false); setPendingPayload(null); }}
        onConfirm={async () => { setConfirmOpen(false); await performCreateTransaction(pendingPayload); setPendingPayload(null); }}
        confirmLabel="Confirm"
      >
        {pendingPayload ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: '#666' }}>Date</div>
              <div style={{ fontWeight: 600 }}>{pendingPayload.date}</div>

              <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Type</div>
              <div>{pendingPayload.type}</div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: '#666' }}>Amount</div>
              <div style={{ fontWeight: 700 }}>{String(pendingPayload.amount).includes('.') ? pendingPayload.amount : `${pendingPayload.amount}.00`}</div>

              <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Category</div>
              <div>{pendingPayload.category || '-'}</div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: '#666' }}>Description</div>
              <div>{pendingPayload.description || '-'}</div>

              <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Attachment</div>
              <div>{pendingPayload.attachment ? pendingPayload.attachment.name : '-'}</div>
            </div>
          </div>
        ) : <div>Preparing...</div>}
      </ConfirmModal>

      {/* ---------- CONFIRM modal for deleting transaction (replaces window.confirm) ---------- */}
      <ConfirmModal
        open={deleteOpen}
        title="Delete Transaction"
        onCancel={() => { setDeleteOpen(false); setDeleteTxId(null); }}
        onConfirm={async () => { setDeleteOpen(false); if (deleteTxId) await handleDelete(deleteTxId); setDeleteTxId(null); }}
        confirmLabel="Delete"
      >
        <div>Are you sure you want to delete this transaction? This action cannot be undone.</div>
      </ConfirmModal>

      {/* ---------- EDIT modal (date input max added) ---------- */}
      {editTx && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.15)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={handleEditSubmit} style={{ width: 'min(700px,95%)', background: colors.bg, padding: 20, borderRadius: 8 }}>
            <h3>Edit Transaction</h3>

            <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Date</label>
            <input
              type="date"
              value={editTx.date_iso || ((editTx.date && typeof editTx.date === 'string' && editTx.date.includes && editTx.date.includes('T')) ? editTx.date.split('T')[0] : (editTx.date || ''))}
              onChange={e => setEditTx({ ...editTx, date: e.target.value, date_iso: e.target.value })}
              max={todayISO}
              style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
            />

            <label style={{ display: 'block', fontSize: 12, marginTop: 12 }}>Amount</label>
            <input value={editTx.amount} onChange={e => setEditTx({ ...editTx, amount: e.target.value })} style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />

            <label style={{ display: 'block', fontSize: 12, marginTop: 12 }}>Description</label>
            <input value={editTx.description || ''} onChange={e => setEditTx({ ...editTx, description: e.target.value })} style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />

            <label style={{ display: 'block', fontSize: 12, marginTop: 12 }}>Category</label>
            <input value={editTx.category || ''} onChange={e => setEditTx({ ...editTx, category: e.target.value })} style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }} />

            <label style={{ display: 'block', fontSize: 12, marginTop: 12 }}>Type</label>
            <select value={editTx.type} onChange={e => setEditTx({ ...editTx, type: e.target.value })} style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}>
              <option value="CASH_OUT">Cash Out</option>
              <option value="CASH_IN">Cash In</option>
            </select>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 14 }}>
              <button type="button" onClick={() => setEditTx(null)} style={{ padding: '8px 12px', background: '#ccc', border: 'none', borderRadius: 6 }}>Cancel</button>
              <button type="submit" style={{ padding: '8px 12px', background: '#111827', color: '#fff', border: 'none', borderRadius: 6 }}>Save</button>
            </div>
          </form>
        </div>
      )}

      {/* ---------- VIEW modal ---------- */}
      {viewTx && <ViewModal tx={viewTx} onClose={() => setViewTx(null)} />}
      {toast && (
        <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 400 }}>
          <div style={{ background: '#111827', color: 'white', padding: 12, borderRadius: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div>{toast.message}</div>
            {toast.action && <button onClick={toast.action} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'white', padding: '6px 10px', borderRadius: 6 }}>{toast.actionLabel || 'Undo'}</button>}
          </div>
        </div>
      )}
      {/* Attachment preview modal */}
      {previewOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setPreviewOpen(false)}>
          <div style={{ width: 'min(90vw,1000px)', height: '80vh', background: '#fff', borderRadius: 8, padding: 12, overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>Attachment Preview</h3>
                {previewName && <div style={{ fontSize: 12, color: '#444', marginTop: 4 }}>{previewName}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{ alignSelf: 'center', fontSize: 13, color: '#1f6feb' }}>Open in new tab</a>
                <button onClick={() => { if (previewUrl) { (async () => {
                    try { const res = await fetch(previewUrl); const blob = await res.blob(); const name = previewName || previewUrl.split('/').pop().split('?')[0]; const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u); } catch { setToast({ message: 'Download failed' }); }
                })(); } }} style={{ padding: '6px 10px', background: '#111827', color: '#fff', border: 'none', borderRadius: 6 }}>Download</button>
                <button onClick={() => setPreviewOpen(false)} style={{ padding: '6px 10px', background: '#f3f4f6', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 6 }}>Close</button>
              </div>
            </div>
            <div style={{ marginTop: 12, height: 'calc(100% - 48px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {previewType === 'image' && <img src={previewUrl} alt="attachment" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 6 }} />}
              {previewType === 'pdf' && <iframe title="attachment-pdf" src={previewUrl} style={{ width: '100%', height: '100%', border: 'none' }} />}
              {previewType === 'other' && (
                <div style={{ textAlign: 'center' }}>
                  <p>Cannot preview this file type.</p>
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer">Open in new tab</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


