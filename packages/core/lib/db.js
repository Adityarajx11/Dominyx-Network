const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false,
});

async function initDatabase() {
  console.log('🗄️  Database pool ready.');
}

module.exports = { pool, initDatabase };
