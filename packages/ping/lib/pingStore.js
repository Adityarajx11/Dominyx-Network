const { pool } = require('@dominyx/core');

async function initPingSettings() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ping_settings (
      guild_id TEXT PRIMARY KEY,
      youtube_channel_id TEXT,
      live_alert_channel_id TEXT,
      enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('📡 Ping settings table ready.');
}

async function getAllEnabledGuilds() {
  const res = await pool.query(
    'SELECT guild_id, youtube_channel_id, live_alert_channel_id FROM ping_settings WHERE enabled = true'
  );
  return res.rows;
}

async function getPingSettings(guildId) {
  const res = await pool.query('SELECT * FROM ping_settings WHERE guild_id = $1', [guildId]);
  return res.rows[0] || null;
}

async function updatePingSettings(guildId, patch) {
  const allowed = ['youtube_channel_id', 'live_alert_channel_id', 'enabled'];
  const keys = Object.keys(patch).filter(k => allowed.includes(k));
  if (keys.length === 0) return getPingSettings(guildId);

  const cols = ['guild_id', ...keys];
  const values = [guildId, ...keys.map(k => patch[k])];
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const updateClause = keys.map(k => `${k} = EXCLUDED.${k}`).join(', ');

  await pool.query(
    `INSERT INTO ping_settings (${cols.join(', ')}) VALUES (${placeholders.join(', ')})
     ON CONFLICT (guild_id) DO UPDATE SET ${updateClause}, updated_at = NOW()`,
    values
  );
  return getPingSettings(guildId);
}

module.exports = { initPingSettings, getAllEnabledGuilds, getPingSettings, updatePingSettings };