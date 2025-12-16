import React, { useEffect } from 'react';
import { useTheme } from '../hooks/useTheme.jsx';

export default function AddBookModal({ open, onClose, onCreate }) {
  const { colors } = useTheme();
  const [name, setName] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  const suggestions = ['November Expenses', 'Salary Book', 'Project Book', 'Client Record'];

  useEffect(() => {
    if (!open) setName('');
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="add-book-backdrop" onMouseDown={onClose}>
      <div
        className="add-book-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ background: colors.bg, color: colors.text }}
      >
        <div className="add-book-header">
          <button className="add-book-close" onClick={onClose} aria-label="Close">✕</button>
          <h3 style={{ margin: 0 }}>Add New Book</h3>
        </div>

        <div className="add-book-body">
          <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: colors.textSecondary }}>Enter Book Name</label>
          <input
            className="add-book-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter Book Name"
            autoFocus
            style={{ background: '#fff', color: '#000' }}
          />

          <div style={{ marginTop: 12, color: colors.textSecondary }}>Suggestions</div>
          <div className="add-book-suggestions">
            {suggestions.map(s => (
              <button
                key={s}
                type="button"
                className="add-book-chip"
                onClick={() => setName(s)}
              >{s}</button>
            ))}
          </div>

          <div style={{ marginTop: 18 }}>
            <button
              className="add-book-action"
              type="button"
              disabled={!name.trim() || creating}
              onClick={async () => {
                if (!onCreate) return;
                try {
                  setCreating(true);
                  await onCreate(name.trim());
                } catch (err) {
                  console.error('Failed to create book:', err);
                } finally {
                  setCreating(false);
                }
              }}
            >
              {creating ? 'Creating…' : '+ ADD NEW BOOK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
