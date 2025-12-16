import React, { useEffect } from 'react';
import { useTheme } from '../hooks/useTheme.jsx';
import { useBooks } from '../hooks/bookContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import BookMembersModal from '../components/BookMembersModal.jsx';

export default function CashbookHome() {
  const { colors } = useTheme();
  const { books, fetchBooks, selectBook, activeBookId, updateBook, deleteBook, duplicateBook } = useBooks();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => { fetchBooks(); }, []);
  // When a book is created (activeBookId set) ensure list refreshes
  useEffect(() => { if (activeBookId) fetchBooks(); }, [activeBookId]);

  const openBook = (book) => {
    selectBook(book.id);
    navigate('/'); // go to Dashboard which will pick up activeBookId
  };

  const [menuOpenFor, setMenuOpenFor] = React.useState(null);
  const [membersModalOpen, setMembersModalOpen] = React.useState(false);
  const [membersBook, setMembersBook] = React.useState(null);

  // Modal state for Edit / Delete actions (replace native prompt/confirm)
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalType, setModalType] = React.useState(null); // 'edit' | 'delete' | null
  const [modalBook, setModalBook] = React.useState(null);
  const [modalInput, setModalInput] = React.useState('');

  const openEditModal = (book) => {
    setModalBook(book);
    setModalInput(book.name || '');
    setModalType('edit');
    setModalOpen(true);
    setMenuOpenFor(null);
  };

  const openDeleteModal = (book) => {
    setModalBook(book);
    setModalType('delete');
    setModalOpen(true);
    setMenuOpenFor(null);
  };

  const openMembersModal = (book) => {
    setMembersBook(book);
    setMembersModalOpen(true);
    setMenuOpenFor(null);
  };

  const closeMembersModal = () => {
    setMembersModalOpen(false);
    setMembersBook(null);
  };

  // Close any open card menu when clicking outside or pressing Escape
  React.useEffect(() => {
    if (menuOpenFor === null) return;
    const onDocClick = (e) => {
      // if click within a menu or a menu trigger, ignore
      const el = e.target;
      if (!el) return setMenuOpenFor(null);
      if (el.closest && (el.closest('[data-menu]') || el.closest('[data-menu-trigger]'))) return;
      setMenuOpenFor(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpenFor(null); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpenFor]);

  const closeModal = () => {
    setModalOpen(false);
    setModalType(null);
    setModalBook(null);
    setModalInput('');
  };

  const confirmEdit = async () => {
    if (!modalBook) return closeModal();
    const newName = String(modalInput || '').trim();
    if (!newName) return; // no-op
    const updated = await updateBook(modalBook.id, newName);
    if (!updated) alert('Failed to rename book');
    closeModal();
  };

  const confirmDelete = async () => {
    if (!modalBook) return closeModal();
    const ok = await deleteBook(modalBook.id);
    if (!ok) alert('Failed to delete book');
    closeModal();
  };

  const onDuplicate = async (book) => {
    const dup = await duplicateBook(book.id);
    if (!dup) alert('Failed to duplicate book');
    setMenuOpenFor(null);
  };

  return (
    <div style={{ padding: 12 }}>
      <h2 style={{ marginBottom: 12 }}>Your Cashbooks</h2>
      {(!books || books.length === 0) ? (
        <div style={{ color: colors.textSecondary }}>No cashbooks yet. Use the + Book button to create one.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
          {books.map(b => (
            <div key={b.id} style={{ position: 'relative' }}>
              <div onClick={() => openBook(b)} role="button" tabIndex={0} style={{ textAlign: 'left', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: '#111827', color: '#ffffff', cursor: 'pointer' }}>
                <div style={{ fontWeight: 700, marginBottom: 6, color: '#ffffff' }}>{b.name}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                  Role: {b.my_role ? (String(b.my_role).toLowerCase() === 'owner' ? 'Owner' : (String(b.my_role).toLowerCase() === 'member' ? 'Member' : b.my_role)) : (String(b.owner_userid) === String(user?.id) ? 'Owner' : 'Member')}
                </div>
              </div>

              {/* three-dots menu */}
              <button aria-label="More" data-menu-trigger onClick={(e) => { e.stopPropagation(); setMenuOpenFor(menuOpenFor === b.id ? null : b.id); }}
                style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 6, borderRadius: 6 }}>
                ⋯
              </button>

                  {menuOpenFor === b.id && (
                <div data-menu onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 40, right: 8, background: '#0b1220', color: '#fff', borderRadius: 6, boxShadow: '0 6px 16px rgba(2,6,23,0.3)', zIndex: 200, minWidth: 160 }}>
                  {/* Only owner or ADMIN may edit/delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); const canEdit = (b.my_role && String(b.my_role) === 'OWNER') || String(b.owner_userid) === String(user?.id) || user?.role === 'ADMIN'; if (canEdit) openEditModal(b); else setToast({ message: 'Only owner may rename this book' }); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', opacity: ((b.my_role && String(b.my_role) === 'OWNER') || String(b.owner_userid) === String(user?.id) || user?.role === 'ADMIN') ? 1 : 0.6 }}
                  >
                    Edit
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); openMembersModal(b); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>Members</button>
                  <button onClick={(e) => { e.stopPropagation(); onDuplicate(b); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>Duplicate</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); const canEdit = (b.my_role && String(b.my_role) === 'OWNER') || String(b.owner_userid) === String(user?.id) || user?.role === 'ADMIN'; if (canEdit) openDeleteModal(b); else setToast({ message: 'Only owner may delete this book' }); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', color: '#ffdddd', cursor: 'pointer', opacity: ((b.my_role && String(b.my_role) === 'OWNER') || String(b.owner_userid) === String(user?.id) || user?.role === 'ADMIN') ? 1 : 0.6 }}
                  >
                    Delete
                  </button>
                </div>
              )}
              {toast && (
                <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 400 }}>
                  <div style={{ background: '#111827', color: 'white', padding: 12, borderRadius: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div>{toast.message}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* Modal: top-positioned, themed */}
      {modalOpen && modalType === 'edit' && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', left: 0, right: 0, top: 70, display: 'flex', justifyContent: 'center', zIndex: 4000 }}>
          <div style={{ width: 'min(720px,90%)', background: '#0b1220', color: '#fff', borderRadius: 8, boxShadow: '0 12px 40px rgba(2,6,23,0.6)', padding: 16 }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Rename book</div>
            <input autoFocus value={modalInput} onChange={e=>setModalInput(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: '#0b1220', color: '#fff', marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={closeModal} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', padding: '8px 12px', borderRadius: 6 }}>Cancel</button>
              <button onClick={confirmEdit} style={{ background: '#2563eb', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: 6 }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && modalType === 'delete' && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', left: 0, right: 0, top: 80, display: 'flex', justifyContent: 'center', zIndex: 4000 }}>
          <div style={{ width: 'min(560px,90%)', background: '#0b1220', color: '#fff', borderRadius: 8, boxShadow: '0 12px 40px rgba(2,6,23,0.6)', padding: 16 }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete book</div>
            <div style={{ marginBottom: 12 }}>Are you sure you want to delete <strong>{modalBook?.name}</strong>? This action cannot be undone.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={closeModal} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', padding: '8px 12px', borderRadius: 6 }}>Cancel</button>
              <button onClick={confirmDelete} style={{ background: '#b91c1c', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: 6 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      <BookMembersModal open={membersModalOpen} onClose={closeMembersModal} bookId={membersBook?.id} bookName={membersBook?.name} />
    </div>
  );
}
