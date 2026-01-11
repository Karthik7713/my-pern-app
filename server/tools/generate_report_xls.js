const fs = require('fs');
const path = require('path');
const pool = require('../src/db');
const { excelBuffer } = require('../src/utils/export');

async function run() {
  try {
    const q = `SELECT t.id, to_char(t.date,'YYYY-MM-DD') AS date_iso, to_char(t.date,'DD/MM/YYYY') AS date_display, t.amount, t.description, t.category, t.type, u.name as user_name,
      COALESCE(t.running_balance,
        (SUM(CASE WHEN t.type='CASH_IN' THEN t.amount ELSE -t.amount END) OVER (PARTITION BY t.user_id ORDER BY t.date, t.id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW))
      )::numeric(12,2) AS running_balance
      FROM transactions t JOIN users u ON t.user_id = u.id ORDER BY t.date DESC LIMIT 200`;
    const { rows } = await pool.query(q);

    const columns = ['id','date_display','amount','running_balance','description','type','user_name'];

    // compute simple summary
    const inQ = `SELECT COALESCE(SUM(amount),0) AS total_cash_in FROM transactions WHERE type='CASH_IN'`;
    const outQ = `SELECT COALESCE(SUM(amount),0) AS total_cash_out FROM transactions WHERE type='CASH_OUT'`;
    const inRes = await pool.query(inQ);
    const outRes = await pool.query(outQ);
    const totalIn = Number(inRes.rows[0].total_cash_in || 0);
    const totalOut = Number(outRes.rows[0].total_cash_out || 0);

    const buf = excelBuffer(rows, columns, { totalIn, totalOut });
    const outPath = path.join(__dirname, '..', 'tmp', 'report_sample.xls');
    fs.writeFileSync(outPath, buf);
    console.log('Wrote', outPath);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(2);
  }
}

run();
