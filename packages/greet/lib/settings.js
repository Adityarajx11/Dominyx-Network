const { pool } = require('@dominyx/core');

async function initGreetSettings() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS greet_settings (
      guild_id TEXT PRIMARY KEY,
      welcome_channel_id TEXT,
      welcome_message TEXT,
      auto_role_id TEXT,
      card_enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE greet_settings ADD COLUMN IF NOT EXISTS goodbye_channel_id TEXT;`);
  await pool.query(`ALTER TABLE greet_settings ADD COLUMN IF NOT EXISTS goodbye_message TEXT;`);
  await pool.query(`ALTER TABLE greet_settings ADD COLUMN IF NOT EXISTS dm_welcome BOOLEAN DEFAULT false;`);
  await pool.query(`ALTER TABLE greet_settings ADD COLUMN IF NOT EXISTS card_theme TEXT DEFAULT 'crimson';`);
  await pool.query(`ALTER TABLE greet_settings ADD COLUMN IF NOT EXISTS greet_bots BOOLEAN DEFAULT false;`);
  console.log('👋 Greet settings table ready.');
}

async function getGreetSettings(guildId) {
  try {
    const result = await pool.query(
      'SELECT * FROM greet_settings WHERE guild_id = $1',
      [guildId]
    );
    if (result.rows.length === 0) return {};
    const row = result.rows[0];
    return {
      welcomeChannelId: row.welcome_channel_id,
      welcomeMessage: row.welcome_message,
      autoRoleId: row.auto_role_id,
      cardEnabled: row.card_enabled,
      goodbyeChannelId: row.goodbye_channel_id,
      goodbyeMessage: row.goodbye_message,
      dmWelcome: row.dm_welcome,
      cardTheme: row.card_theme || 'crimson',
      greetBots: row.greet_bots,
    };
  } catch (err) {
    console.error('Failed to fetch greet settings:', err.message);
    return {};
  }
}

async function updateGreetSettings(guildId, patch) {
  const mappings = {
    welcomeChannelId: 'welcome_channel_id',
    welcomeMessage: 'welcome_message',
    autoRoleId: 'auto_role_id',
    cardEnabled: 'card_enabled',
    goodbyeChannelId: 'goodbye_channel_id',
    goodbyeMessage: 'goodbye_message',
    dmWelcome: 'dm_welcome',
    cardTheme: 'card_theme',
    greetBots: 'greet_bots',
  };

  const keys = Object.keys(patch).filter(k => mappings[k]);
  if (keys.length === 0) return getGreetSettings(guildId);

  const cols = ['guild_id', ...keys.map(k => mappings[k])];
  const values = [guildId, ...keys.map(k => patch[k])];
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const updateClause = keys.map(k => `${mappings[k]} = EXCLUDED.${mappings[k]}`).join(', ');

  await pool.query(
    `INSERT INTO greet_settings (${cols.join(', ')}) VALUES (${placeholders.join(', ')})
     ON CONFLICT (guild_id) DO UPDATE SET ${updateClause}, updated_at = NOW()`,
    values
  );

  return getGreetSettings(guildId);
}

module.exports = { initGreetSettings, getGreetSettings, updateGreetSettings };