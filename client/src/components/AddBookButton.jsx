import React from 'react';
import { useTheme } from '../hooks/useTheme.jsx';
import AddBookModal from './AddBookModal.jsx';
import { useBooks } from '../hooks/bookContext';

export default function AddBookButton() {
  const { colors } = useTheme();
  const [open, setOpen] = React.useState(false);
  const { createBook } = useBooks();

  const style = {
    position: 'fixed',
    right: 18,
    bottom: 18,
    minWidth: 56,
    height: 56,
    borderRadius: 14,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '0 14px',
    boxShadow: '0 8px 22px rgba(2,6,23,0.25)',
    border: 'none',
    cursor: 'pointer',
    zIndex: 2000,
    background: colors.buttonPrimary,
    color: '#fff',
    fontWeight: 700,
  };

  return (
    <>
      <button
        aria-label="Add Book"
        title="Add Book"
        onClick={() => setOpen(true)}
        style={style}
        className="add-book-button"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ fontSize: 14, lineHeight: 1 }}>{'Add Book'}</span>
      </button>
      <AddBookModal
        open={open}
        onClose={() => setOpen(false)}
        onCreate={async (name) => {
          try {
            let book = null;
            if (createBook) book = await createBook(name);
            // only close on success (book created)
            if (book) setOpen(false);
          } catch (e) { console.error(e); }
        }}
      />
    </>
  );
}
