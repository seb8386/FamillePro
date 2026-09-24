require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const demoAccounts = [
  {
    email: 'plus.demo@famillepro.local',
    password: 'DemoPlus123!',
    firstName: 'Plan',
    lastName: 'Plus',
    systemRole: 'admin',
    familyName: 'Famille Plus Demo',
    plan: 'plus',
  },
  {
    email: 'premium.demo@famillepro.local',
    password: 'DemoPremium123!',
    firstName: 'Plan',
    lastName: 'Premium',
    systemRole: 'admin',
    familyName: 'Famille Premium Demo',
    plan: 'premium',
  },
  {
    email: 'superadmin@famillepro.local',
    password: 'SuperAdmin123!',
    firstName: 'Super',
    lastName: 'Admin',
    systemRole: 'super_admin',
    familyName: 'Famille Super Admin',
    plan: 'premium',
  },
];

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();

    for (const account of demoAccounts) {
      const existing = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [account.email.toLowerCase().trim()]
      );

      let userId;
      const passwordHash = await bcrypt.hash(account.password, 12);

      if (existing.rows.length > 0) {
        userId = existing.rows[0].id;
        await client.query(
          `UPDATE users
           SET password_hash = $1,
               system_role = $2,
               is_active = true,
               updated_at = NOW()
           WHERE id = $3`,
          [passwordHash, account.systemRole, userId]
        );
      } else {
        const result = await client.query(
          `INSERT INTO users (email, password_hash, system_role, email_verified, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, true, true, NOW(), NOW())
           RETURNING id`,
          [account.email.toLowerCase().trim(), passwordHash, account.systemRole]
        );
        userId = result.rows[0].id;
      }

      await client.query(
        `INSERT INTO profiles (user_id, first_name, last_name, locale, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           locale = EXCLUDED.locale,
           updated_at = NOW()`,
        [userId, account.firstName, account.lastName, 'fr']
      );

      const slugBase = `demo-${account.email.split('@')[0].replace(/\./g, '-')}`;
      const familyResult = await client.query(
        `INSERT INTO families (name, slug, owner_id, plan, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, true, NOW(), NOW())
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           owner_id = EXCLUDED.owner_id,
           plan = EXCLUDED.plan,
           updated_at = NOW()
         RETURNING id`,
        [account.familyName, slugBase, userId, account.plan]
      );

      const familyId = familyResult.rows[0].id;

      await client.query(
        `INSERT INTO family_members (family_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (family_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [familyId, userId, 'admin']
      );

      console.log(JSON.stringify({
        email: account.email,
        password: account.password,
        systemRole: account.systemRole,
        plan: account.plan,
        family: account.familyName,
      }));
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
