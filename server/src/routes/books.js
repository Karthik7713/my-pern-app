const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { requireBookAccess, userHasAccessToBook } = require('../middleware/bookAccess');

const router = express.Router();

// List books for current user (owned or member)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = String(req.user.id);
    // NOTE: Runtime fallback in place for legacy DBs. See `server/FALLBACK_README.md`.
    // Some databases may have `book_members.user_userid` (new schema) or legacy `book_members.user_id`.
    // Try a query referencing the newer column first; if the column doesn't exist, fallback to legacy column.
    const qNew = `SELECT b.*, CASE WHEN b.owner_userid::text = $1 THEN 'OWNER' WHEN bm.role IS NOT NULL THEN bm.role ELSE NULL END AS my_role FROM books b LEFT JOIN book_members bm ON b.id = bm.book_id AND bm.user_userid::text = $1 WHERE b.owner_userid::text = $1 OR bm.user_userid::text = $1 ORDER BY b.created_at DESC`;
    const qLegacy = `SELECT b.*, CASE WHEN b.owner_userid::text = $1 THEN 'OWNER' WHEN bm.role IS NOT NULL THEN bm.role ELSE NULL END AS my_role FROM books b LEFT JOIN book_members bm ON b.id = bm.book_id AND bm.user_id::text = $1 WHERE b.owner_userid::text = $1 OR bm.user_id::text = $1 ORDER BY b.created_at DESC`;
    let rows;
    try {
      rows = (await pool.query(qNew, [userId])).rows;
    } catch (err) {
      // if the error is missing column, try legacy
      console.warn('books: new column query failed, trying legacy column', err?.message || err);
      rows = (await pool.query(qLegacy, [userId])).rows;
    }
    res.json({ status: 'ok', data: { books: rows } });
  } catch (err) {
    console.error('List books error', err);
    res.status(500).json({ status: 'error', error: 'Failed to list books' });
  }
});

// Create a book; current user becomes owner
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ status: 'error', error: 'Missing name' });
    const userId = String(req.user.id);
    const q = `INSERT INTO books (name, owner_userid) VALUES ($1, $2) RETURNING *`;
    const { rows } = await pool.query(q, [String(name).trim(), userId]);
    res.status(201).json({ status: 'ok', data: { book: rows[0] } });
  } catch (err) {
    console.error('Create book error', err);
    res.status(500).json({ status: 'error', error: 'Failed to create book' });
  }
});

// Get book details (requires access)
router.get('/:bookId', authenticateToken, requireBookAccess, async (req, res) => {
  try {
    const { bookId } = req.params;
    const { rows } = await pool.query('SELECT * FROM books WHERE id=$1', [bookId]);
    if (rows.length === 0) return res.status(404).json({ status: 'error', error: 'Not found' });
    res.json({ status: 'ok', data: { book: rows[0] } });
  } catch (err) {
    console.error('Get book error', err);
    res.status(500).json({ status: 'error', error: 'Failed to get book' });
  }
});

// List members (requires access)
router.get('/:bookId/members', authenticateToken, requireBookAccess, async (req, res) => {
  try {
    const { bookId } = req.params;
    const { rows } = await pool.query('SELECT * FROM book_members WHERE book_id=$1', [bookId]);
    res.json({ status: 'ok', data: { members: rows } });
  } catch (err) {
    console.error('List book members error', err);
    res.status(500).json({ status: 'error', error: 'Failed to list members' });
  }
});

// Add member (only owner)
router.post('/:bookId/members', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.params;
    const { user_userid, role = 'MEMBER' } = req.body;
    if (!user_userid) return res.status(400).json({ status: 'error', error: 'Missing member user id' });
    // check owner
    const { rows: bookRows } = await pool.query('SELECT owner_userid FROM books WHERE id=$1', [bookId]);
    if (bookRows.length === 0) return res.status(404).json({ status: 'error', error: 'Book not found' });
    if (String(bookRows[0].owner_userid) !== String(req.user.id)) return res.status(403).json({ status: 'error', error: 'Only owner may add members' });
    try {
      await pool.query('INSERT INTO book_members (book_id, user_userid, role) VALUES ($1,$2,$3) ON CONFLICT (book_id, user_userid) DO UPDATE SET role = EXCLUDED.role', [bookId, String(user_userid), role]);
    } catch (err) {
      // fallback to legacy column name `user_id` if `user_userid` doesn't exist
      console.warn('Add member: insert with user_userid failed, trying user_id', err?.message || err);
      await pool.query('INSERT INTO book_members (book_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT (book_id, user_id) DO UPDATE SET role = EXCLUDED.role', [bookId, String(user_userid), role]);
    }
    res.status(201).json({ status: 'ok' });
  } catch (err) {
    console.error('Add member error', err);
    res.status(500).json({ status: 'error', error: 'Failed to add member' });
  }
});

// Remove member (only owner)
router.delete('/:bookId/members/:user_userid', authenticateToken, async (req, res) => {
  try {
    const { bookId, user_userid } = req.params;
    const { rows: bookRows } = await pool.query('SELECT owner_userid FROM books WHERE id=$1', [bookId]);
    if (bookRows.length === 0) return res.status(404).json({ status: 'error', error: 'Book not found' });
    if (String(bookRows[0].owner_userid) !== String(req.user.id)) return res.status(403).json({ status: 'error', error: 'Only owner may remove members' });
    try {
      await pool.query('DELETE FROM book_members WHERE book_id=$1 AND user_userid=$2', [bookId, String(user_userid)]);
    } catch (err) {
      console.warn('Remove member: delete with user_userid failed, trying user_id', err?.message || err);
      await pool.query('DELETE FROM book_members WHERE book_id=$1 AND user_id=$2', [bookId, String(user_userid)]);
    }
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Remove member error', err);
    res.status(500).json({ status: 'error', error: 'Failed to remove member' });
  }
});

// Update book (rename) - owner only
router.patch('/:bookId', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.params;
    const { name } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ status: 'error', error: 'Missing name' });
    const { rows: bookRows } = await pool.query('SELECT owner_userid FROM books WHERE id=$1', [bookId]);
    if (bookRows.length === 0) return res.status(404).json({ status: 'error', error: 'Book not found' });
    if (String(bookRows[0].owner_userid) !== String(req.user.id)) return res.status(403).json({ status: 'error', error: 'Only owner may update book' });
    const { rows } = await pool.query('UPDATE books SET name=$1 WHERE id=$2 RETURNING *', [String(name).trim(), bookId]);
    res.json({ status: 'ok', data: { book: rows[0] } });
  } catch (err) {
    console.error('Update book error', err);
    res.status(500).json({ status: 'error', error: 'Failed to update book' });
  }
});

// Delete book - owner only. Attempts to clean up members and transactions if columns exist.
router.delete('/:bookId', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.params;
    const { rows: bookRows } = await pool.query('SELECT owner_userid FROM books WHERE id=$1', [bookId]);
    if (bookRows.length === 0) return res.status(404).json({ status: 'error', error: 'Book not found' });
    if (String(bookRows[0].owner_userid) !== String(req.user.id)) return res.status(403).json({ status: 'error', error: 'Only owner may delete book' });

    // Try to nullify or remove references in transactions.book_id if the column exists
    try {
      await pool.query('UPDATE transactions SET book_id = NULL WHERE book_id = $1', [bookId]);
    } catch (e) {
      // ignore if column doesn't exist
      console.warn('Delete book: transactions.book_id update failed (maybe column missing)', e?.message || e);
    }

    // delete members (try both column names)
    try {
      await pool.query('DELETE FROM book_members WHERE book_id=$1', [bookId]);
    } catch (e) {
      console.warn('Delete book: deleting members failed', e?.message || e);
    }

    // finally delete the book
    await pool.query('DELETE FROM books WHERE id=$1', [bookId]);
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Delete book error', err);
    res.status(500).json({ status: 'error', error: 'Failed to delete book' });
  }
});

// Duplicate a book (creates a new book owned by current user and copies members)
router.post('/:bookId/duplicate', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = String(req.user.id);
    // ensure caller has access
    const { rows: source } = await pool.query('SELECT * FROM books WHERE id=$1', [bookId]);
    if (source.length === 0) return res.status(404).json({ status: 'error', error: 'Source book not found' });
    const src = source[0];

    const newName = `${src.name} (copy)`;
    const { rows: newRows } = await pool.query('INSERT INTO books (name, owner_userid) VALUES ($1,$2) RETURNING *', [newName, userId]);
    const newBook = newRows[0];

    // copy members: attempt to select both potential columns and insert accordingly
    try {
      const membersRes = await pool.query('SELECT user_userid, user_id, role FROM book_members WHERE book_id=$1', [bookId]);
      for (const m of membersRes.rows) {
        const uid = m.user_userid || m.user_id;
        if (!uid) continue;
        try {
          await pool.query('INSERT INTO book_members (book_id, user_userid, role) VALUES ($1,$2,$3) ON CONFLICT (book_id, user_userid) DO UPDATE SET role = EXCLUDED.role', [newBook.id, String(uid), m.role || 'MEMBER']);
        } catch (e) {
          // fallback to legacy column
          try {
            await pool.query('INSERT INTO book_members (book_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT (book_id, user_id) DO UPDATE SET role = EXCLUDED.role', [newBook.id, String(uid), m.role || 'MEMBER']);
          } catch (ee) {
            console.warn('Duplicate book: failed to insert member', ee?.message || ee);
          }
        }
      }
    } catch (e) {
      console.warn('Duplicate book: failed to read/copy members', e?.message || e);
    }

    res.status(201).json({ status: 'ok', data: { book: newBook } });
  } catch (err) {
    console.error('Duplicate book error', err);
    res.status(500).json({ status: 'error', error: 'Failed to duplicate book' });
  }
});

module.exports = router;
