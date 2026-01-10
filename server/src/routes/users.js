// server/src/routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

// Get current user's profile (must be before /admin GET)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, name, email, role, is_active, currency_preference, theme_preference, created_at FROM users WHERE id=$1', [req.user.id]);
    res.json({ status: 'ok', data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', error: 'DB error' });
  }
});

// Update profile (name, email, preferences)
router.put('/me', authenticateToken, body('email').optional().isEmail(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, currency_preference, theme_preference } = req.body;
  try {
    const q = `UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), currency_preference = COALESCE($3, currency_preference), theme_preference = COALESCE($4, theme_preference) WHERE id = $5 RETURNING id, name, email, role, is_active, currency_preference, theme_preference`;
    const vals = [name, email, currency_preference, theme_preference, req.user.id];
    const { rows } = await db.query(q, vals);
    res.json({ status: 'ok', data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', error: 'DB error' });
  }
});

// Change password - allow using either current password or server SECRET_CODE (for trusted resets)
router.put(
  '/me/password',
  authenticateToken,
  body('currentPassword').optional(),
  body('secretCode').optional(),
  body('newPassword').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { currentPassword, secretCode, newPassword } = req.body;

    if (!currentPassword && !secretCode) return res.status(400).json({ status: 'error', error: 'Provide currentPassword or secretCode' });

    try {
      // If secretCode provided, verify against env SECRET_CODE (trim both sides)
      let authorized = false;
      if (secretCode) {
        const expected = (process.env.SECRET_CODE || '').trim();
        if (expected && String(secretCode).trim() === expected) {
          authorized = true;
        } else {
          return res.status(401).json({ status: 'error', error: 'Invalid secret code' });
        }
      }

      if (!authorized) {
        // verify current password
        const { rows } = await db.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
        const user = rows[0] || {};
        const ok = await bcrypt.compare(currentPassword || '', user.password_hash || '');
        if (!ok) return res.status(401).json({ status: 'error', error: 'Current password incorrect' });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [newHash, req.user.id]);
      res.json({ status: 'ok', data: { ok: true } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: 'error', error: 'DB error' });
    }
  }
);

// Admin: list all users (must be after /me routes)
router.get('/', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY id');
    res.json({ status: 'ok', data: { rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', error: 'DB error' });
  }
});

// Search users by name or email (authenticated users)
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const searchTerm = q ? `%${q}%` : '%';
    const { rows } = await db.query(
      `SELECT id, name, email FROM users WHERE (name ILIKE $1 OR email ILIKE $1) ORDER BY name LIMIT 50`,
      [searchTerm]
    );
    res.json({ status: 'ok', data: rows });
  } catch (err) {
    console.error('user search error', err);
    res.status(500).json({ status: 'error', error: 'DB error' });
  }
});

// Batch fetch users by id (authenticated users)
router.get('/batch', authenticateToken, async (req, res) => {
  try {
    const ids = String(req.query.ids || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!ids.length) return res.json({ status: 'ok', data: [] });
    const { rows } = await db.query(
      `SELECT id, name, email FROM users WHERE id::text = ANY($1::text[])`,
      [ids]
    );
    res.json({ status: 'ok', data: rows });
  } catch (err) {
    console.error('user batch fetch error', err);
    res.status(500).json({ status: 'error', error: 'DB error' });
  }
});

module.exports = router;
