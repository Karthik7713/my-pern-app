const db = require('../src/db');
const { pdfBuffer } = require('../src/utils/export');
const fs = require('fs');

(async function(){
  try {
    const q = `SELECT t.id, to_char(t.date,'YYYY-MM-DD') AS date_iso, to_char(t.date,'DD/MM/YYYY') AS date_display, t.amount, t.description, t.type, u.name as user_name FROM transactions t JOIN users u ON t.user_id = u.id ORDER BY t.date DESC LIMIT 40`;
    const res = await db.query(q, []);
    const rows = res.rows;
    const columns = ['id','date_display','amount','description','type','user_name','running_balance'];
    const buf = await pdfBuffer('Transactions Report', rows, columns);
    fs.writeFileSync('server/tmp/report_sample.pdf', buf);
    console.log('Wrote server/tmp/report_sample.pdf');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(2);
  }
})();
