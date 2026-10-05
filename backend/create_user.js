const bcrypt = require('bcryptjs');
const db = require('./config/db');

(async () => {
  try {
    const password = 'Password123!';
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    await db.query(
      `INSERT INTO users (full_name, email, password_hash, provider, is_email_verified, is_profile_complete) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (email) DO NOTHING`,
      ['Test User', 'test@example.com', hash, 'email', true, true]
    );
    console.log('User created');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
