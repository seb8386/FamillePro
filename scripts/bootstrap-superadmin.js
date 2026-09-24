require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

(async () => {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password || password.length < 12) {
    throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD (12+ characters) are required');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();

    const existing = await client.query(
      'SELECT id, email, system_role FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      await client.query(
        'UPDATE users SET system_role = $1, is_active = true, updated_at = NOW() WHERE email = $2',
        ['super_admin', email]
      );

      console.log(JSON.stringify({ action: 'updated', email, systemRole: 'super_admin' }));
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await client.query(
      `INSERT INTO users (email, password_hash, system_role, email_verified, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, true, true, NOW(), NOW())
       RETURNING id, email, system_role`,
      [email, passwordHash, 'super_admin']
    );

    const user = result.rows[0];
    await client.query(
      `INSERT INTO profiles (user_id, first_name, last_name, locale, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [user.id, 'Super', 'Admin', 'fr']
    );

    console.log(JSON.stringify({ action: 'created', user }));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
