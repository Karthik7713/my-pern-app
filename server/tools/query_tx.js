const db = require('../src/db');
const id = process.argv[2] || 66;
(async()=>{
  try {
    const q = `SELECT id, date, to_char(date,'YYYY-MM-DD') as date_iso, to_char(date,'DD/MM/YYYY') as date_display, created_at, to_char(created_at,'DD/MM/YYYY') as created_at_date, to_char(created_at,'HH12:MI:SS AM') as created_at_time FROM transactions WHERE id=$1`;
    const { rows } = await db.pool.query(q, [Number(id)]);
    console.log(JSON.stringify(rows, null, 2));
    await db.pool.end();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
