const { pool } = require('@dominyx/core');

async function initGuardTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guard_settings (
      guild_id TEXT PRIMARY KEY,
      modlog_channel_id TEXT,
      self_role_categories JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE guard_settings ADD COLUMN IF NOT EXISTS automod_spam BOOLEAN DEFAULT false;`);
  await pool.query(`ALTER TABLE guard_settings ADD COLUMN IF NOT EXISTS spam_threshold INTEGER DEFAULT 5;`);
  await pool.query(`ALTER TABLE guard_settings ADD COLUMN IF NOT EXISTS spam_seconds INTEGER DEFAULT 10;`);
  await pool.query(`ALTER TABLE guard_settings ADD COLUMN IF NOT EXISTS automod_links BOOLEAN DEFAULT false;`);
  await pool.query(`ALTER TABLE guard_settings ADD COLUMN IF NOT EXISTS automod_caps BOOLEAN DEFAULT false;`);
  await pool.query(`ALTER TABLE guard_settings ADD COLUMN IF NOT EXISTS caps_threshold INTEGER DEFAULT 70;`);
  await pool.query(`ALTER TABLE guard_settings ADD COLUMN IF NOT EXISTS mute_role_id TEXT;`);
  await pool.query(`ALTER TABLE guard_settings ADD COLUMN IF NOT EXISTS warns_mute INTEGER DEFAULT 3;`);
  await pool.query(`ALTER TABLE guard_settings ADD COLUMN IF NOT EXISTS warns_ban INTEGER DEFAULT 5;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS guild_case_counters (
      guild_id TEXT PRIMARY KEY,
      last_case_number INTEGER DEFAULT 0
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mod_cases (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      case_number INTEGER NOT NULL,
      action TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_tag TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      moderator_tag TEXT NOT NULL,
      reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mod_notes (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      note TEXT NOT NULL,
      added_by TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log('🛡️ Guard tables ready.');
}

async function getGuardSettings(guildId) {
  const res = await pool.query('SELECT * FROM guard_settings WHERE guild_id = $1', [guildId]);
  return res.rows[0] || null;
}

async function updateGuardSettings(guildId, patch) {
  const allowed = [
    'modlog_channel_id', 'self_role_categories',
    'automod_spam', 'spam_threshold', 'spam_seconds',
    'automod_links', 'automod_caps', 'caps_threshold',
    'mute_role_id', 'warns_mute', 'warns_ban',
  ];
  const keys = Object.keys(patch).filter(k => allowed.includes(k));
  if (keys.length === 0) return getGuardSettings(guildId);

  const cols = ['guild_id', ...keys];
  const values = [guildId, ...keys.map(k => (typeof patch[k] === 'object' ? JSON.stringify(patch[k]) : patch[k]))];
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const updateClause = keys.map(k => `${k} = EXCLUDED.${k}`).join(', ');

  await pool.query(
    `INSERT INTO guard_settings (${cols.join(', ')}) VALUES (${placeholders.join(', ')})
     ON CONFLICT (guild_id) DO UPDATE SET ${updateClause}, updated_at = NOW()`,
    values
  );
  return getGuardSettings(guildId);
}

async function addSelfRole(guildId, category, roleId) {
  const settings = await getGuardSettings(guildId);
  const categories = { ...(settings?.self_role_categories || {}) };
  if (!categories[category]) categories[category] = [];
  if (!categories[category].includes(roleId)) categories[category].push(roleId);
  return updateGuardSettings(guildId, { self_role_categories: categories });
}

async function removeSelfRole(guildId, roleId) {
  const settings = await getGuardSettings(guildId);
  const categories = { ...(settings?.self_role_categories || {}) };
  let foundCategory = null;

  for (const [category, roleIds] of Object.entries(categories)) {
    if (roleIds.includes(roleId)) {
      categories[category] = roleIds.filter(id => id !== roleId);
      if (categories[category].length === 0) delete categories[category];
      foundCategory = category;
      break;
    }
  }

  await updateGuardSettings(guildId, { self_role_categories: categories });
  return foundCategory;
}

module.exports = { initGuardTables, getGuardSettings, updateGuardSettings, addSelfRole, removeSelfRole };