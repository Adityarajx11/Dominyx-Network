const { pool } = require('@dominyx/core');

async function initMusicSettings() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS music_settings (
      guild_id TEXT PRIMARY KEY,
      stay_247 BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('🎵 Music settings table ready.');
}

async function get247(guildId) {
  try {
    const result = await pool.query(
      'SELECT stay_247 FROM music_settings WHERE guild_id = $1',
      [guildId]
    );
    return result.rows[0]?.stay_247 || false;
  } catch (err) {
    console.error('Failed to get 247 setting:', err.message);
    return false;
  }
}

async function set247(guildId, value) {
  await pool.query(
    `INSERT INTO music_settings (guild_id, stay_247, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (guild_id) DO UPDATE SET stay_247 = $2, updated_at = NOW()`,
    [guildId, value]
  );
}

module.exports = { initMusicSettings, get247, set247 };