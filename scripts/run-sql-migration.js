require('dotenv').config({ path: '.env.local' });
const fs = require('node:fs');
const { Client } = require('pg');

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(fs.readFileSync('scripts/collaboration-migration.sql', 'utf8'));
    console.log('collaboration migration applied');
  } finally {
    await client.end();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
