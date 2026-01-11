const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { userHasAccessToBook } = require('../middleware/bookAccess');
const { logAudit } = require('../utils/audit');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Helper: recompute running_balance for a partition (book_id or user_id)
async function recomputePartition({ bookId = null, userId = null }) {
  if (!bookId && !userId) return;
  if (bookId) {
    await pool.query(
      `WITH ordered AS (
         SELECT id,
           (SUM(CASE WHEN type='CASH_IN' THEN amount ELSE -amount END)
             OVER (PARTITION BY book_id ORDER BY date, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
           )::numeric(12,2) AS rb
         FROM transactions
         WHERE book_id = $1 AND is_deleted = false
       )
       UPDATE transactions t
       SET running_balance = o.rb
       FROM ordered o
       WHERE t.id = o.id`,
      [bookId]
    );
  } else {
    await pool.query(
      `WITH ordered AS (
         SELECT id,
           (SUM(CASE WHEN type='CASH_IN' THEN amount ELSE -amount END)
             OVER (PARTITION BY user_id ORDER BY date, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
           )::numeric(12,2) AS rb
         FROM transactions
         WHERE user_id = $1 AND is_deleted = false
       )
       UPDATE transactions t
       SET running_balance = o.rb
       FROM ordered o
       WHERE t.id = o.id`,
      [userId]
    );
  }
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2,8)}${ext}`);
  }
});
const upload = multer({ storage });

// List transactions with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, type, category, q, amountMin, amountMax, limit = 50, offset = 0, book_id } = req.query;

    const clauses = ['is_deleted = false'];
    const vals = [];
    let idx = 0;

    if (book_id) {
      // check access to the requested book
      const ok = await userHasAccessToBook(userId, book_id);
      if (!ok && req.user.role !== 'ADMIN') return res.status(403).json({ status: 'error', error: 'Access denied to book' });
      idx++; vals.push(book_id); clauses.push(`t.book_id = $${idx}`);
    } else {
      // legacy behavior: show transactions created by the user when no book specified
      idx++; vals.push(userId); clauses.push(`t.user_id = $${idx}`);
    }

    if (startDate) {
      idx++; vals.push(startDate); clauses.push(`date >= $${idx}`);
    }
    if (endDate) {
      idx++; vals.push(endDate); clauses.push(`date <= $${idx}`);
    }
    if (type) {
      idx++; vals.push(type); clauses.push(`type = $${idx}`);
    }
    if (category) {
      idx++; vals.push(category); clauses.push(`category = $${idx}`);
    }
    if (q) {
      idx++; vals.push(`%${q}%`); clauses.push(`(description ILIKE $${idx})`);
    }
    if (amountMin) {
      idx++; vals.push(amountMin); clauses.push(`amount >= $${idx}`);
    }
    if (amountMax) {
      idx++; vals.push(amountMax); clauses.push(`amount <= $${idx}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    // Return stored running_balance if available and user_name
    const query = `SELECT t.*, to_char(t.date, 'DD/MM/YYYY') AS date_display, to_char(t.date, 'YYYY-MM-DD') AS date_iso, to_char(t.created_at AT TIME ZONE 'Asia/Kolkata', 'DD/MM/YYYY') AS created_at_date, to_char(t.created_at AT TIME ZONE 'Asia/Kolkata', 'HH12:MI:SS AM') AS created_at_time, u.name as user_name, t.running_balance FROM transactions t JOIN users u ON t.user_id = u.id ${where} ORDER BY t.date DESC, t.id DESC LIMIT $${++idx} OFFSET $${++idx}`;
    vals.push(Number(limit));
    vals.push(Number(offset));

    const { rows } = await pool.query(query, vals);
    // Remove raw JS Date fields from API responses to avoid timezone confusion on the client
    rows.forEach(r => { if (r) { delete r.date; delete r.created_at; } });
    res.json({ status: 'ok', data: { rows } });
  } catch (err) {
    console.error('List transactions error:', err);
    res.status(500).json({ status: 'error', error: 'Failed to list transactions' });
  }
});

// Create transaction
router.post(
  '/',
  authenticateToken,
  body('date').isISO8601().withMessage('Valid date required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be > 0'),
  body('type').isIn(['CASH_IN', 'CASH_OUT']).withMessage('Invalid type'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ status: 'error', error: 'Validation failed', data: { errors: errors.array() } });

    try {
      const { date, amount, description = null, category = null, type, book_id = null } = req.body;
      const userId = req.user.id;
      if (book_id) {
        const ok = await userHasAccessToBook(userId, book_id);
        if (!ok && req.user.role !== 'ADMIN') return res.status(403).json({ status: 'error', error: 'Access denied to book' });
      }

      // duplicate-detection removed: allow creating transactions without server-side duplicate blocking
      const q = `INSERT INTO transactions (user_id,date,amount,description,category,type,book_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`;
      const vals = [userId, date, amount, description, category, type, book_id];
      const ins = await pool.query(q, vals);
      const createdId = ins.rows[0].id;
      // Re-select the inserted row with formatted date/time fields to avoid JS Date timezone conversion
      const selQ = `SELECT t.*, to_char(t.date, 'DD/MM/YYYY') AS date_display, to_char(t.date, 'YYYY-MM-DD') AS date_iso, to_char(t.created_at AT TIME ZONE 'Asia/Kolkata', 'DD/MM/YYYY') AS created_at_date, to_char(t.created_at AT TIME ZONE 'Asia/Kolkata', 'HH12:MI:SS AM') AS created_at_time, u.name as user_name FROM transactions t JOIN users u ON t.user_id = u.id WHERE t.id = $1`;
      const selRes = await pool.query(selQ, [createdId]);
      const created = selRes.rows[0];
      if (created) { delete created.date; delete created.created_at; }

      // If the DB has a `running_balance` column, compute and store the running balance for this transaction.
      try {
        await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS running_balance numeric(12,2)`);

        // Recompute running balances for the entire partition affected by this insert.
        // If the transaction belongs to a book, partition by book_id; otherwise partition by user_id.
        if (book_id) {
          await pool.query(
            `WITH ordered AS (
               SELECT id,
                 (SUM(CASE WHEN type='CASH_IN' THEN amount ELSE -amount END)
                   OVER (PARTITION BY book_id ORDER BY date, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
                 )::numeric(12,2) AS rb
               FROM transactions
               WHERE book_id = $1 AND is_deleted = false
             )
             UPDATE transactions t
             SET running_balance = o.rb
             FROM ordered o
             WHERE t.id = o.id`,
            [book_id]
          );
        } else {
          await pool.query(
            `WITH ordered AS (
               SELECT id,
                 (SUM(CASE WHEN type='CASH_IN' THEN amount ELSE -amount END)
                   OVER (PARTITION BY user_id ORDER BY date, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
                 )::numeric(12,2) AS rb
               FROM transactions
               WHERE user_id = $1 AND is_deleted = false
             )
             UPDATE transactions t
             SET running_balance = o.rb
             FROM ordered o
             WHERE t.id = o.id`,
            [userId]
          );
        }

        // refresh created row to include running_balance
        const selRes2 = await pool.query(selQ, [createdId]);
        Object.assign(created, selRes2.rows[0]);
      } catch (e) {
        console.warn('Could not compute running_balance:', e.message || e);
      }

      // audit
      logAudit({ userId, action: 'CREATE', entity_type: 'TRANSACTION', entity_id: created.id, details: created });

      res.status(201).json({ status: 'ok', data: { transaction: created } });
    } catch (err) {
      console.error('Create transaction error:', err);
      res.status(500).json({ status: 'error', error: 'Failed to create transaction' });
    }
  }
);

// Update transaction
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { date, amount, description, category, type } = req.body;

    // owner check
    const ownership = await pool.query('SELECT * FROM transactions WHERE id=$1', [id]);
    if (ownership.rows.length === 0) return res.status(404).json({ status: 'error', error: 'Transaction not found' });
    const tx = ownership.rows[0];
    if (tx.user_id !== userId && req.user.role !== 'ADMIN') return res.status(403).json({ status: 'error', error: 'Forbidden' });

    const q = `UPDATE transactions SET date=$1, amount=$2, description=$3, category=$4, type=$5 WHERE id=$6 RETURNING id`;
    const vals = [date || tx.date, amount || tx.amount, description || tx.description, category || tx.category, type || tx.type, id];
    await pool.query(q, vals);
    // Recompute running_balance for affected partition, then re-select formatted row
    try {
      await recomputePartition({ bookId: tx.book_id, userId: tx.user_id });
    } catch (e) {
      console.warn('Recompute after update failed:', e?.message || e);
    }
    const selQ = `SELECT t.*, to_char(t.date, 'DD/MM/YYYY') AS date_display, to_char(t.date, 'YYYY-MM-DD') AS date_iso, to_char(t.created_at AT TIME ZONE 'Asia/Kolkata', 'DD/MM/YYYY') AS created_at_date, to_char(t.created_at AT TIME ZONE 'Asia/Kolkata', 'HH12:MI:SS AM') AS created_at_time, u.name as user_name FROM transactions t JOIN users u ON t.user_id = u.id WHERE t.id = $1`;
    const selRes = await pool.query(selQ, [id]);
    const updated = selRes.rows[0];
    if (updated) { delete updated.date; delete updated.created_at; }

    logAudit({ userId, action: 'UPDATE', entity_type: 'TRANSACTION', entity_id: updated.id, details: updated });

    res.json({ status: 'ok', data: { transaction: updated } });
  } catch (err) {
    console.error('Update transaction error:', err);
    res.status(500).json({ status: 'error', error: 'Failed to update transaction' });
  }
});

// Soft delete
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const ownership = await pool.query('SELECT * FROM transactions WHERE id=$1', [id]);
    if (ownership.rows.length === 0) return res.status(404).json({ status: 'error', error: 'Transaction not found' });
    const tx = ownership.rows[0];
    if (tx.user_id !== userId && req.user.role !== 'ADMIN') return res.status(403).json({ status: 'error', error: 'Forbidden' });

    await pool.query('UPDATE transactions SET is_deleted = true WHERE id = $1', [id]);
    logAudit({ userId, action: 'DELETE', entity_type: 'TRANSACTION', entity_id: id, details: tx });
    // recompute partition balances after soft-delete
    try {
      await recomputePartition({ bookId: tx.book_id, userId: tx.user_id });
    } catch (e) {
      console.warn('Recompute after delete failed:', e?.message || e);
    }
    res.json({ status: 'ok', data: { ok: true } });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ status: 'error', error: 'Failed to delete transaction' });
  }
});

// Restore (undo soft-delete)
router.post('/:id/restore', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const ownership = await pool.query('SELECT * FROM transactions WHERE id=$1', [id]);
    if (ownership.rows.length === 0) return res.status(404).json({ status: 'error', error: 'Transaction not found' });
    const tx = ownership.rows[0];
    if (tx.user_id !== userId && req.user.role !== 'ADMIN') return res.status(403).json({ status: 'error', error: 'Forbidden' });

    await pool.query('UPDATE transactions SET is_deleted = false WHERE id = $1', [id]);
    logAudit({ userId, action: 'RESTORE', entity_type: 'TRANSACTION', entity_id: id, details: tx });
    // recompute partition balances after restore
    try {
      await recomputePartition({ bookId: tx.book_id, userId: tx.user_id });
    } catch (e) {
      console.warn('Recompute after restore failed:', e?.message || e);
    }
    res.json({ status: 'ok', data: { ok: true } });
  } catch (err) {
    console.error('Restore transaction error:', err);
    res.status(500).json({ status: 'error', error: 'Failed to restore transaction' });
  }
});

// Upload receipt
router.post('/:id/upload-receipt', authenticateToken, upload.single('receipt'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const file = req.file;
    if (!file) return res.status(400).json({ status: 'error', error: 'No file uploaded' });

    const ownership = await pool.query('SELECT * FROM transactions WHERE id=$1', [id]);
    if (ownership.rows.length === 0) return res.status(404).json({ status: 'error', error: 'Transaction not found' });
    const tx = ownership.rows[0];
    if (tx.user_id !== userId && req.user.role !== 'ADMIN') return res.status(403).json({ status: 'error', error: 'Forbidden' });

    // Store path using forward-slashes so URLs work consistently across OSes
    const receiptPath = `${UPLOAD_DIR}/${file.filename}`.replace(/\\/g, '/');
    const q = `UPDATE transactions SET receipt_path=$1 WHERE id=$2 RETURNING *`;
    const { rows } = await pool.query(q, [receiptPath, id]);
    const updated = rows[0];
    if (updated) { delete updated.date; delete updated.created_at; }

    logAudit({ userId, action: 'UPLOAD_RECEIPT', entity_type: 'TRANSACTION', entity_id: id, details: { receipt: receiptPath } });

    res.json({ status: 'ok', data: { transaction: updated } });
  } catch (err) {
    console.error('Upload receipt error:', err);
    res.status(500).json({ status: 'error', error: 'Failed to upload receipt' });
  }
});

module.exports = router;
