// Simple test script to verify date round-trip without persisting changes.
// Usage: node server/tools/test_date_roundtrip.js [YYYY-MM-DD]

const db = require('../src/db');

(async function(){
  const testDate = process.argv[2] || '2025-12-01';
  console.log('Running date round-trip test for date:', testDate);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    // find any user to own the test row
    const ures = await client.query('SELECT id FROM users LIMIT 1');
    if (ures.rows.length === 0) {
      console.error('No user found in users table; aborting test');
      await client.query('ROLLBACK');
      return process.exit(2);
    }
    const userId = ures.rows[0].id;

    const insQ = `INSERT INTO transactions (user_id,date,amount,type,description,category) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`;
    const insRes = await client.query(insQ, [userId, testDate, 123.45, 'CASH_IN', 'roundtrip-test', 'test']);
    const id = insRes.rows[0].id;

    const selQ = `SELECT id, to_char(date,'YYYY-MM-DD') AS date_iso, to_char(date,'DD/MM/YYYY') AS date_display FROM transactions WHERE id=$1`;
    const selRes = await client.query(selQ, [id]);
    console.log('Inserted row select:', selRes.rows[0]);

    if (selRes.rows[0].date_iso === testDate) {
      console.log('SUCCESS: date_iso matches inserted date exactly.');
    } else {
      console.warn('MISMATCH: inserted date != selected date_iso');
    }

    // rollback so no test data persists
    await client.query('ROLLBACK');
    console.log('Rolled back test insert.');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    try { await client.query('ROLLBACK'); } catch (e) {}
    process.exit(3);
  } finally {
    client.release();
  }
})();
