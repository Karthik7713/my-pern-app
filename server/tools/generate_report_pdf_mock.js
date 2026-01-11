const fs = require('fs');
const { pdfBuffer } = require('../src/utils/export');

(async function(){
  try {
    // generate 120 mock rows to exercise multi-page layout
    const rows = [];
    for (let i = 1; i <= 120; i++) {
      rows.push({
        id: i,
        date_iso: '2025-12-0' + ((i % 9) + 1),
        date_display: ('0' + ((i % 30) + 1)).slice(-2) + '/12/2025',
        amount: (Math.random() * 10000).toFixed(2),
        running_balance: ((Math.random() - 0.5) * 100000).toFixed(2),
        description: `Sample transaction ${i}`,
        type: i % 3 === 0 ? 'CASH_IN' : 'CASH_OUT',
        user_name: 'testuser'
      });
    }

    const columns = ['id','date_display','amount','running_balance','description','type','user_name'];
    const buf = await pdfBuffer('Mock Transactions Report', rows, columns);
    const out = 'server/tmp/report_sample_mock.pdf';
    fs.mkdirSync('server/tmp', { recursive: true });
    fs.writeFileSync(out, buf);
    console.log('Wrote', out);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(2);
  }
})();
