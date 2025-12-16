const pool = require('../db');

async function logAudit({ userId = null, action, entity_type = null, entity_id = null, details = null }) {
  try {
    const q = `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5) RETURNING *`;
    const vals = [userId, action, entity_type, entity_id, details ? JSON.stringify(details) : null];
    const { rows } = await pool.query(q, vals);
    return rows[0];
  } catch (err) {
    console.error('Failed to write audit log:', err);
    return null;
  }
}

module.exports = { logAudit };
