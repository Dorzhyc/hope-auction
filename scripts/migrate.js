const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

(async () => {
  try {
    const sqlDir = path.join(__dirname, '..', 'sql');
    const files = fs.readdirSync(sqlDir).filter(f => f.endsWith('.sql')).sort();
    for (const f of files) {
      const sql = fs.readFileSync(path.join(sqlDir, f), 'utf8');
      console.log(`Running ${f}...`);
      await pool.query(sql);
    }
    console.log("Migrations complete.");
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
