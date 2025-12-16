const express = require('express');
const pool = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const router = express.Router();

// List all users (duplicates earlier but admin-specific filtering/pagination can be added)
router.get('/users', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error('Admin list users error:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// Activate/deactivate user
router.put('/users/:id/status', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const { rows } = await pool.query('UPDATE users SET is_active=$1 WHERE id=$2 RETURNING id, name, email, role, is_active', [is_active, id]);
    logAudit({ userId: req.user.id, action: 'UPDATE_USER_STATUS', entity_type: 'USER', entity_id: id, details: { is_active } });
    res.json(rows[0]);
  } catch (err) {
    console.error('Admin change user status error:', err);
    res.status(500).json({ error: 'Failed to change user status' });
  }
});

// View a user's transactions
router.get('/users/:id/transactions', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT id, date, amount, description, category, type, receipt_path FROM transactions WHERE user_id=$1 AND is_deleted=false ORDER BY date DESC', [id]);
    res.json({ rows });
  } catch (err) {
    console.error('Admin user transactions error:', err);
    res.status(500).json({ error: 'Failed to fetch user transactions' });
  }
});

// Audit logs
router.get('/audit-logs', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { userId, action, startDate, endDate } = req.query;
    const clauses = [];
    const vals = [];
    let idx = 0;
    if (userId) { idx++; vals.push(userId); clauses.push(`user_id = $${idx}`); }
    if (action) { idx++; vals.push(action); clauses.push(`action = $${idx}`); }
    if (startDate) { idx++; vals.push(startDate); clauses.push(`created_at >= $${idx}`); }
    if (endDate) { idx++; vals.push(endDate); clauses.push(`created_at <= $${idx}`); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const q = `SELECT id, user_id, action, entity_type, entity_id, details, created_at FROM audit_logs ${where} ORDER BY created_at DESC LIMIT 500`;
    const { rows } = await pool.query(q, vals);
    res.json({ rows });
  } catch (err) {
    console.error('Admin audit logs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
