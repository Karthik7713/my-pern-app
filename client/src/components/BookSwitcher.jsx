import React from 'react';
import { useBooks } from '../hooks/bookContext';
import AddBookModal from './AddBookModal.jsx';

export default function BookSwitcher() {
  const { books, activeBookId, selectBook, createBook } = useBooks();
  const [open, setOpen] = React.useState(false);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <select value={activeBookId || ''} onChange={(e) => selectBook(e.target.value || null)} style={{ padding: 6, borderRadius: 6 }}>
        <option value="">Select Book</option>
        {books.map(b => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
      <button onClick={() => setOpen(true)} style={{ padding: '6px 8px', borderRadius: 8, background: '#111827', color: '#fff', border: 'none' }}>+ Book</button>
      <AddBookModal open={open} onClose={() => setOpen(false)} onCreate={async (name) => { await createBook(name); setOpen(false); }} />
    </div>
  );
}
