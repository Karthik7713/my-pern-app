const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { userHasAccessToBook } = require('../middleware/bookAccess');
const { csvBuffer, pdfBuffer, excelBuffer } = require('../utils/export');

const router = express.Router();

// Dashboard summary: totals and recent transactions
router.get('/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, limit: limitRaw = 5, book_id } = req.query;
    // Protect against very large limits which force expensive window computations.
    const limit = Math.min( Math.max(Number(limitRaw) || 5, 1), 500 );

    const dateFilter = [];
    const vals = [];
    let idx = 0;
    if (book_id) {
      const ok = await userHasAccessToBook(userId, book_id);
      if (!ok && req.user.role !== 'ADMIN') return res.status(403).json({ status: 'error', error: 'Access denied to book' });
      idx++; vals.push(book_id); // placeholder for potential book filter use below
    } else {
      idx++; vals.push(userId);
    }
    if (startDate) { idx++; vals.push(startDate); dateFilter.push(`date >= $${idx}`); }
    if (endDate) { idx++; vals.push(endDate); dateFilter.push(`date <= $${idx}`); }
    const whereDate = dateFilter.length ? `AND ${dateFilter.join(' AND ')}` : '';

    // If book_id provided, scope by book_id; otherwise fallback to user_id
    const bookWhere = book_id ? `book_id = $1` : `user_id = $1`;
    const inQ = `SELECT COALESCE(SUM(amount),0)::numeric(12,2) AS total_cash_in FROM transactions WHERE ${bookWhere} AND type='CASH_IN' AND is_deleted=false ${whereDate}`;
    const outQ = `SELECT COALESCE(SUM(amount),0)::numeric(12,2) AS total_cash_out FROM transactions WHERE ${bookWhere} AND type='CASH_OUT' AND is_deleted=false ${whereDate}`;
    // Compute running balance (balance at each transaction) using a window function.
    // We compute the cumulative sum in chronological order, then return the most recent rows.
    // Prefer stored running_balance if available; include user_name.
    // Compute running_balance per transaction using window function when stored value is missing.
    // For dashboard, return recent transactions but avoid expensive window computations
    // (the full running balance calculation can be costly on large tables). We prefer
    // to return stored `running_balance` when present; otherwise leave it NULL so the
    // client can display amounts without computing a historical running total.
    const recentQ = `SELECT t.id, to_char(t.date, 'DD/MM/YYYY') AS date_display, to_char(t.date, 'YYYY-MM-DD') AS date_iso, t.amount, t.description, t.category, t.type, t.receipt_path, to_char(t.created_at AT TIME ZONE 'Asia/Kolkata', 'DD/MM/YYYY') AS created_at_date, to_char(t.created_at AT TIME ZONE 'Asia/Kolkata', 'HH12:MI:SS AM') AS created_at_time, u.name AS user_name,
      COALESCE(t.running_balance, NULL)::numeric(12,2) AS running_balance
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE ${bookWhere} AND t.is_deleted = false ${whereDate}
      ORDER BY t.date DESC, t.id DESC
      LIMIT $${++idx}`;
    vals.push(Number(limit));

    const inRes = await pool.query(inQ, [vals[0]]);
    const outRes = await pool.query(outQ, [vals[0]]);
    const recentRes = await pool.query(recentQ, vals);

    const totalIn = Number(inRes.rows[0].total_cash_in || 0);
    const totalOut = Number(outRes.rows[0].total_cash_out || 0);
    const balance = (totalIn - totalOut).toFixed(2);

    res.json({ status: 'ok', data: { total_cash_in: totalIn, total_cash_out: totalOut, balance, recent: recentRes.rows } });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ status: 'error', error: 'Failed to fetch dashboard summary' });
  }
});

// Reports summary grouped by category or date (simple)
router.get('/reports/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { groupBy = 'category', startDate, endDate } = req.query;
    const group = groupBy === 'date' ? 'date' : 'category';

    const { book_id } = req.query;
    const clauses = [];
    const vals = [];
    let idx = 0;
    if (book_id) {
      const ok = await userHasAccessToBook(userId, book_id);
      if (!ok && req.user.role !== 'ADMIN') return res.status(403).json({ status: 'error', error: 'Access denied to book' });
      idx++; vals.push(book_id); clauses.push(`book_id = $${idx}`);
    } else {
      idx++; vals.push(userId); clauses.push(`user_id = $${idx}`);
    }
    if (startDate) { idx++; vals.push(startDate); clauses.push(`date >= $${idx}`); }
    if (endDate) { idx++; vals.push(endDate); clauses.push(`date <= $${idx}`); }
    const where = `WHERE ${clauses.join(' AND ')}`;
    const q = `SELECT ${group} as key, SUM(CASE WHEN type='CASH_IN' THEN amount ELSE 0 END) as cash_in, SUM(CASE WHEN type='CASH_OUT' THEN amount ELSE 0 END) as cash_out FROM transactions ${where} GROUP BY ${group} ORDER BY cash_in DESC NULLS LAST`;
    const { rows } = await pool.query(q, vals);
    // attach absolute receipt URL for client convenience
    const base = `${req.protocol}://${req.get('host')}`;
    rows.forEach(r => { r.receipt_url = r.receipt_path ? `${base}/${String(r.receipt_path).replace(/^\/+/, '')}` : ''; });
    res.json({ rows });
  } catch (err) {
    console.error('Reports summary error:', err);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Reports details: list transactions by filter
router.get('/reports/details', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, type, category, book_id } = req.query;
    const clauses = ['t.is_deleted = false'];
    const vals = [];
    let idx = 0;

    if (book_id) {
      const ok = await userHasAccessToBook(userId, book_id);
      if (!ok && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied to book' });
      idx++; vals.push(book_id); clauses.unshift(`t.book_id = $${idx}`);
    } else {
      idx++; vals.push(userId); clauses.unshift(`t.user_id = $${idx}`);
    }

    if (startDate) { idx++; vals.push(startDate); clauses.push(`t.date >= $${idx}`); }
    if (endDate) { idx++; vals.push(endDate); clauses.push(`t.date <= $${idx}`); }
    if (type) { idx++; vals.push(type); clauses.push(`t.type = $${idx}`); }
    if (category) { idx++; vals.push(category); clauses.push(`t.category = $${idx}`); }

    const where = `WHERE ${clauses.join(' AND ')}`;
    const partitionBy = book_id ? 't.book_id' : 't.user_id';
    const q = `SELECT t.id, to_char(t.date,'YYYY-MM-DD') AS date_iso, to_char(t.date,'DD/MM/YYYY') AS date_display, t.amount, t.description, t.category, t.type, t.receipt_path, u.name AS user_name,
      COALESCE(t.running_balance,
        (SUM(CASE WHEN t.type='CASH_IN' THEN t.amount ELSE -t.amount END) OVER (PARTITION BY ${partitionBy} ORDER BY t.date, t.id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW))
      )::numeric(12,2) AS running_balance
      FROM transactions t JOIN users u ON t.user_id = u.id ${where} ORDER BY t.date DESC, t.id DESC`;
    const { rows } = await pool.query(q, vals);
    res.json({ rows });
  } catch (err) {
    console.error('Reports details error:', err);
    res.status(500).json({ error: 'Failed to fetch details' });
  }
});

// Export CSV
router.get('/reports/export/csv', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, book_id } = req.query;
    const clauses = ['t.is_deleted = false'];
    const vals = [];
    let idx = 0;

    if (book_id) {
      const ok = await userHasAccessToBook(userId, book_id);
      if (!ok && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied to book' });
      idx++; vals.push(book_id); clauses.unshift(`t.book_id = $${idx}`);
    } else {
      idx++; vals.push(userId); clauses.unshift(`t.user_id = $${idx}`);
    }

    if (startDate) { idx++; vals.push(startDate); clauses.push(`t.date >= $${idx}`); }
    if (endDate) { idx++; vals.push(endDate); clauses.push(`t.date <= $${idx}`); }
    const where = `WHERE ${clauses.join(' AND ')}`;
    const partitionBy = book_id ? 't.book_id' : 't.user_id';
    const q = `SELECT t.id, to_char(t.date,'YYYY-MM-DD') AS date_iso, to_char(t.date,'DD/MM/YYYY') AS date_display, t.amount, t.description, t.category, t.type, t.receipt_path, u.name as user_name,
      COALESCE(t.running_balance,
        (SUM(CASE WHEN t.type='CASH_IN' THEN t.amount ELSE -t.amount END) OVER (PARTITION BY ${partitionBy} ORDER BY t.date, t.id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW))
      )::numeric(12,2) AS running_balance
      FROM transactions t JOIN users u ON t.user_id = u.id ${where} ORDER BY t.date DESC`;
    const { rows } = await pool.query(q, vals);
    // Build absolute receipt URL for exported rows (if present)
    const base = `${req.protocol}://${req.get('host')}`;
    rows.forEach(r => { r.receipt_url = r.receipt_path ? `${base}/${String(r.receipt_path).replace(/^\/+/, '')}` : ''; });

    const columns = ['id','date_display','amount','running_balance','description','type','user_name','receipt_url'];
    // Resolve a descriptive title for the export. If `book_id` is provided, fetch the book name.
    let exportTitle = 'Transactions Report';
    if (book_id) {
      try {
        const bk = await pool.query('SELECT name FROM books WHERE id = $1', [book_id]);
        if (bk.rows[0] && bk.rows[0].name) exportTitle = `${bk.rows[0].name} Report`;
      } catch (e) {
        // ignore and fallback to default title
      }
    }
    // Ensure transactions table is aliased as `t` because `where` contains `t.` references
    const summaryQIn = `SELECT COALESCE(SUM(t.amount),0)::numeric(12,2) AS total_cash_in FROM transactions t ${where} AND t.type='CASH_IN'`;
    const summaryQOut = `SELECT COALESCE(SUM(t.amount),0)::numeric(12,2) AS total_cash_out FROM transactions t ${where} AND t.type='CASH_OUT'`;
    const inRes = await pool.query(summaryQIn, vals);
    const outRes = await pool.query(summaryQOut, vals);
    const totalIn = Number(inRes.rows[0].total_cash_in || 0);
    const totalOut = Number(outRes.rows[0].total_cash_out || 0);

    const buf = excelBuffer(rows, columns, { totalIn, totalOut }, { title: exportTitle });
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename="${exportTitle.replace(/[^a-z0-9]/gi,'_').toLowerCase()}_${Date.now()}.xls"`);
    res.send(buf);
  } catch (err) {
    console.error('Export CSV error:', err);
    // Provide a bit more context when possible
    try { console.error('Export CSV query vars:', { startDate: req.query.startDate, endDate: req.query.endDate, book_id: req.query.book_id }); } catch (e) {}
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Export PDF
router.get('/reports/export/pdf', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, book_id } = req.query;
    const clauses = ['t.is_deleted = false'];
    const vals = [];
    let idx = 0;

    if (book_id) {
      const ok = await userHasAccessToBook(userId, book_id);
      if (!ok && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied to book' });
      idx++; vals.push(book_id); clauses.unshift(`t.book_id = $${idx}`);
    } else {
      idx++; vals.push(userId); clauses.unshift(`t.user_id = $${idx}`);
    }

    if (startDate) { idx++; vals.push(startDate); clauses.push(`t.date >= $${idx}`); }
    if (endDate) { idx++; vals.push(endDate); clauses.push(`t.date <= $${idx}`); }
    const where = `WHERE ${clauses.join(' AND ')}`;
    const partitionBy = book_id ? 't.book_id' : 't.user_id';
    const q = `SELECT t.id, to_char(t.date,'YYYY-MM-DD') AS date_iso, to_char(t.date,'DD/MM/YYYY') AS date_display, t.amount, t.description, t.category, t.type, t.receipt_path, u.name as user_name,
      COALESCE(t.running_balance,
        (SUM(CASE WHEN t.type='CASH_IN' THEN t.amount ELSE -t.amount END) OVER (PARTITION BY ${partitionBy} ORDER BY t.date, t.id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW))
      )::numeric(12,2) AS running_balance
      FROM transactions t JOIN users u ON t.user_id = u.id ${where} ORDER BY t.date DESC`;
    const { rows } = await pool.query(q, vals);

    // attach absolute receipt URL for exported rows
    const base = `${req.protocol}://${req.get('host')}`;
    rows.forEach(r => { r.receipt_url = r.receipt_path ? `${base}/${String(r.receipt_path).replace(/^\/+/, '')}` : ''; });

    const columns = ['id','date_display','amount','running_balance','description','type','user_name','receipt_url'];
    let exportTitle = 'Transactions Report';
    if (book_id) {
      try {
        const bk = await pool.query('SELECT name FROM books WHERE id = $1', [book_id]);
        if (bk.rows[0] && bk.rows[0].name) exportTitle = `${bk.rows[0].name} Report`;
      } catch (e) { /* ignore */ }
    }
    const buf = await pdfBuffer(exportTitle, rows, columns);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${exportTitle.replace(/[^a-z0-9]/gi,'_').toLowerCase()}_${Date.now()}.pdf"`);
    res.send(buf);
  } catch (err) {
    console.error('Export PDF error:', err);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

module.exports = router;
