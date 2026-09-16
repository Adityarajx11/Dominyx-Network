const { Pool } = require('pg');
const { databaseUrl } = require('./env');

if (!databaseUrl) {
  console.warn('[hq] DATABASE_URL not set — config features disabled.');
}

const pool = new Pool({
  connectionString: databaseUrl || undefined,
  ssl: databaseUrl?.includes('railway') || databaseUrl?.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false,
});

module.exports = pool;