import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const BookContext = createContext(null);

export function BookProvider({ children }) {
  const [books, setBooks] = useState([]);
  const [activeBookId, setActiveBookId] = useState(() => {
    try { return localStorage.getItem('activeBookId'); } catch (e) { return null; }
  });

  const fetchBooks = async () => {
    try {
      const res = await api.get('/books');
      setBooks(res.data?.data?.books || res.data?.books || []);
    } catch (err) {
      console.error('Failed to fetch books', err);
      setBooks([]);
    }
  };

  useEffect(() => { fetchBooks(); }, []);

  const createBook = async (name) => {
    try {
      const res = await api.post('/books', { name });
      const book = res.data?.data?.book || res.data?.book;
      // Optimistically add the new book to local state so UI updates immediately
      if (book) {
        setBooks(prev => {
          try {
            const exists = prev.some(b => String(b.id) === String(book.id));
            if (exists) return prev;
          } catch (e) {}
          return [book, ...prev];
        });
        setActiveBookId(String(book.id));
        try { localStorage.setItem('activeBookId', String(book.id)); } catch (e) {}
      }
      // Refresh from server to ensure canonical state
      try { await fetchBooks(); } catch (e) {}
      return book;
    } catch (err) {
      console.error('createBook failed', err);
      return null;
    }
  };

  const updateBook = async (bookId, name) => {
    try {
      const res = await api.patch(`/books/${bookId}`, { name });
      const updated = res.data?.data?.book;
      if (updated) await fetchBooks();
      return updated;
    } catch (err) {
      console.error('updateBook failed', err);
      return null;
    }
  };

  const deleteBook = async (bookId) => {
    try {
      await api.delete(`/books/${bookId}`);
      await fetchBooks();
      // if active was deleted, clear active
      if (String(activeBookId) === String(bookId)) selectBook(null);
      return true;
    } catch (err) {
      console.error('deleteBook failed', err);
      return false;
    }
  };

  const duplicateBook = async (bookId) => {
    try {
      const res = await api.post(`/books/${bookId}/duplicate`);
      const book = res.data?.data?.book || res.data?.book;
      if (book) {
        // refresh list
        await fetchBooks();
        return book;
      }
      return null;
    } catch (err) {
      console.error('duplicateBook failed', err);
      return null;
    }
  };

  const selectBook = (id) => {
    setActiveBookId(id ? String(id) : null);
    try { if (id) localStorage.setItem('activeBookId', String(id)); else localStorage.removeItem('activeBookId'); } catch (e) {}
  };

  return React.createElement(
    BookContext.Provider,
    { value: { books, fetchBooks, createBook, activeBookId, selectBook, updateBook, deleteBook, duplicateBook } },
    children
  );
}

export function useBooks() {
  const ctx = useContext(BookContext);
  if (!ctx) throw new Error('useBooks must be used inside BookProvider');
  return ctx;
}
