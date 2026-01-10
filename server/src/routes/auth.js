const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';
const SECRET_CODE = process.env.SECRET_CODE;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mkarthikreddy7713@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'NanNihongo@2004';

// In non-test environments, require sensitive environment variables to be set.
if (process.env.NODE_ENV !== 'test') {
  if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
  if (!SECRET_CODE) throw new Error('SECRET_CODE environment variable is required');
}

// Signup
router.post(
  '/signup',
  body('name').isLength({ min: 1 }).withMessage('Name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  body('secretCode').notEmpty().withMessage('Secret code required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, secretCode } = req.body;
    
    // Verify secret code (trim to avoid accidental whitespace mismatches)
    if (String(secretCode || '').trim() !== String(SECRET_CODE || '').trim()) {
      return res.status(403).json({ error: 'Invalid secret code' });
    }

    try {
      // check existing
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });

      const password_hash = await bcrypt.hash(password, 10);
      const q = `INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id, name, email, role, is_active, currency_preference, theme_preference`;
      const vals = [name, email, password_hash];
      const { rows } = await pool.query(q, vals);
      const user = rows[0];

      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
      res.status(201).json({ status: 'ok', data: { token, user } });
    } catch (err) {
      console.error('Signup error:', err);
      res.status(500).json({ status: 'error', error: 'Failed to register' });
    }
  }
);

// Login
router.post(
  '/login',
  body('email').isEmail(),
  body('password').isLength({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    try {
      // Special-case admin fixed credentials: require secret code and issue an ADMIN token without DB lookup
      if (String(email).trim() === String(ADMIN_EMAIL).trim() && String(password) === String(ADMIN_PASSWORD)) {
        const providedCode = String(req.body?.secretCode || '').trim();
        if (!providedCode || providedCode !== String(SECRET_CODE || '').trim()) {
          console.warn('Attempted admin login with missing/invalid secret code');
          return res.status(403).json({ error: 'Invalid admin authentication' });
        }
        const adminUser = { id: null, name: 'Admin', email: ADMIN_EMAIL, role: 'ADMIN', is_active: true, currency_preference: 'USD', theme_preference: 'light' };
        const token = jwt.sign({ isAdmin: true, role: 'ADMIN' }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
        return res.json({ status: 'ok', data: { token, user: adminUser } });
      }

      const { rows } = await pool.query('SELECT id, name, email, password_hash, role, is_active, currency_preference, theme_preference FROM users WHERE email = $1', [email]);
      if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
      const user = rows[0];
      if (!user.is_active) {
        console.warn(`Login attempt for deactivated user: ${email}`);
        return res.status(403).json({ error: 'User is deactivated' });
      }

      const ok = await bcrypt.compare(password, user.password_hash || '');
      if (!ok) {
        console.warn(`Invalid password for user: ${email}`);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
      // Don't expose password_hash
      delete user.password_hash;
      res.json({ status: 'ok', data: { token, user } });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ status: 'error', error: 'Login failed' });
    }
  }
);

// Simple logout (client-side token remove recommended) - we can optionally support token blacklist later
router.post('/logout', (req, res) => {
  // For stateless JWT, instruct client to delete token
  res.json({ status: 'ok', data: { ok: true } });
});

// Forgot password - request reset
router.post(
  '/forgot-password',
  body('email').isEmail().withMessage('Valid email required'),
  body('secretCode').notEmpty().withMessage('Secret code required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, secretCode } = req.body;
    
    // Verify secret code (trim to avoid accidental whitespace mismatches)
    if (String(secretCode || '').trim() !== String(SECRET_CODE || '').trim()) {
      return res.status(403).json({ error: 'Invalid secret code' });
    }

    try {
      const user = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (user.rows.length === 0) {
        return res.status(404).json({ status: 'error', error: 'Email not found' });
      }
      res.json({ status: 'ok', data: { message: 'Reset token sent', ok: true } });
    } catch (err) {
      console.error('Forgot password error:', err);
      res.status(500).json({ status: 'error', error: 'Failed to process request' });
    }
  }
);

// Reset password
router.post(
  '/reset-password',
  body('email').isEmail().withMessage('Valid email required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  body('secretCode').notEmpty().withMessage('Secret code required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, newPassword, secretCode } = req.body;
    
    // Verify secret code
    if (secretCode !== SECRET_CODE) {
      return res.status(403).json({ error: 'Invalid secret code' });
    }

    try {
      const user = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (user.rows.length === 0) {
        return res.status(404).json({ status: 'error', error: 'Email not found' });
      }

      const userId = user.rows[0].id;
      const password_hash = await bcrypt.hash(newPassword, 10);
      
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, userId]);
      res.json({ status: 'ok', data: { message: 'Password reset successfully', ok: true } });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ status: 'error', error: 'Failed to reset password' });
    }
  }
);

module.exports = router;
