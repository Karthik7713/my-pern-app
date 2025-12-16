const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET;

if (process.env.NODE_ENV !== 'test' && !JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader && authHeader.split(' ')[0] === 'Bearer' ? authHeader.split(' ')[1] : null;
    if (!token) return res.status(401).json({ status: 'error', error: 'Missing token' });

    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || !payload.userId) return res.status(401).json({ status: 'error', error: 'Invalid token' });

    // fetch user from DB and attach
    const { rows } = await pool.query('SELECT id, name, email, role, is_active, currency_preference, theme_preference FROM users WHERE id = $1', [payload.userId]);
    if (rows.length === 0) return res.status(401).json({ status: 'error', error: 'User not found' });

    const user = rows[0];
    if (!user.is_active) return res.status(403).json({ status: 'error', error: 'User is deactivated' });

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ status: 'error', error: 'Authentication failed' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ status: 'error', error: 'Not authenticated' });
    if (req.user.role !== role) return res.status(403).json({ status: 'error', error: 'Insufficient privileges' });
    next();
  };
}

module.exports = { authenticateToken, requireRole };
