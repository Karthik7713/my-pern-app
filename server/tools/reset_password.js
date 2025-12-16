const bcrypt = require('bcryptjs');
const db = require('../src/db');

async function reset(email, newPassword) {
  if (!email || !newPassword) {
    console.error('Usage: node reset_password.js <email> <newPassword>');
    process.exit(2);
  }
  try {
    const hash = await bcrypt.hash(newPassword, 10);
    const res = await db.query('UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email', [hash, email]);
    if (res.rows.length === 0) {
      console.error('No user found with email', email);
      process.exit(1);
    }
    console.log('Password reset for', res.rows[0].email);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(3);
  }
}

reset(process.argv[2], process.argv[3]);
