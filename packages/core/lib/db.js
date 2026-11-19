const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false },
      // Fail fast instead of hanging when the database is unreachable.
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 10,
    })
  : null;

if (pool) {
  pool.on('error', (err) => {
    console.error('⚠️ Postgres pool error (idle client):', err.message);
  });
}

// Tests swap in an in-memory Postgres implementation.
let injectedPool = null;

function usePool(instance) {
  injectedPool = instance;
}

async function initDatabase() {
  if (!injectedPool && !pool) {
    throw new Error('DATABASE_URL is not set — add it to the bot .env before starting.');
  }
  try {
    await (injectedPool || pool).query('SELECT 1');
    console.log('🗄️  Database pool ready.');
  } catch (err) {
    console.error('⚠️ Could not reach the database:', err.message);
    throw err;
  }
}

module.exports = {
  get pool() {
    if (injectedPool) return injectedPool;
    if (!pool) {
      throw new Error('DATABASE_URL is not set — add it to the bot .env before starting.');
    }
    return pool;
  },
  initDatabase,
  usePool,
};
