const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:5639@localhost:5432/Smartfinance' });

async function verify() {
  try {
    const res = await pool.query(
      "UPDATE advisors SET is_email_verified = true, approval_status = 'approved' WHERE email = $1",
      ['harshwardhansathe1@gmail.com']
    );
    console.log(res.rowCount + ' row(s) updated.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
verify();
