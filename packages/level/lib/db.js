const { pool } = require('@dominyx/core');

async function initLevelDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_xp (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      last_message_at TIMESTAMPTZ,
      PRIMARY KEY (guild_id, user_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS level_roles (
      guild_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      role_id TEXT NOT NULL,
      PRIMARY KEY (guild_id, level)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS level_config (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT,
      message_template TEXT
    );
  `);

  await pool.query(`ALTER TABLE level_config ADD COLUMN IF NOT EXISTS xp_min INTEGER DEFAULT 15;`);
  await pool.query(`ALTER TABLE level_config ADD COLUMN IF NOT EXISTS xp_max INTEGER DEFAULT 25;`);
  await pool.query(`ALTER TABLE level_config ADD COLUMN IF NOT EXISTS cooldown_seconds INTEGER DEFAULT 60;`);
  await pool.query(`ALTER TABLE level_config ADD COLUMN IF NOT EXISTS ignored_channels JSONB DEFAULT '[]';`);
  await pool.query(`ALTER TABLE level_config ADD COLUMN IF NOT EXISTS ignored_roles JSONB DEFAULT '[]';`);
  await pool.query(`ALTER TABLE level_config ADD COLUMN IF NOT EXISTS role_stack BOOLEAN DEFAULT true;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_stats (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      messages INTEGER DEFAULT 0,
      voice_minutes INTEGER DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (guild_id, user_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS category_roles (
      guild_id TEXT NOT NULL,
      category TEXT NOT NULL,
      role_id TEXT NOT NULL,
      PRIMARY KEY (guild_id, category)
    );
  `);

  console.log('🗄️  Level tables ready.');
}

async function getUserXp(guildId, userId) {
  const result = await pool.query(
    `SELECT * FROM user_xp WHERE guild_id = $1 AND user_id = $2`,
    [guildId, userId]
  );
  return result.rows[0] || null;
}

async function upsertUserXp(guildId, userId, xp, level, lastMessageAt) {
  await pool.query(
    `INSERT INTO user_xp (guild_id, user_id, xp, level, last_message_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (guild_id, user_id)
     DO UPDATE SET xp = $3, level = $4, last_message_at = $5`,
    [guildId, userId, xp, level, lastMessageAt]
  );
}

async function getLeaderboard(guildId, limit = 10) {
  const result = await pool.query(
    `SELECT * FROM user_xp WHERE guild_id = $1 ORDER BY level DESC, xp DESC LIMIT $2`,
    [guildId, limit]
  );
  return result.rows;
}

async function addLevelRole(guildId, level, roleId) {
  await pool.query(
    `INSERT INTO level_roles (guild_id, level, role_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (guild_id, level) DO UPDATE SET role_id = $3`,
    [guildId, level, roleId]
  );
}

async function removeLevelRole(guildId, level) {
  await pool.query(`DELETE FROM level_roles WHERE guild_id = $1 AND level = $2`, [guildId, level]);
}

async function getLevelRoles(guildId) {
  const result = await pool.query(
    `SELECT * FROM level_roles WHERE guild_id = $1 ORDER BY level ASC`,
    [guildId]
  );
  return result.rows;
}

async function getLevelConfig(guildId) {
  const result = await pool.query(`SELECT * FROM level_config WHERE guild_id = $1`, [guildId]);
  return result.rows[0] || null;
}

async function setLevelConfig(guildId, channelId, messageTemplate) {
  await pool.query(
    `INSERT INTO level_config (guild_id, channel_id, message_template)
     VALUES ($1, $2, $3)
     ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2, message_template = $3`,
    [guildId, channelId, messageTemplate]
  );
}

const CATEGORIES = ['messages', 'voice', 'level'];

async function bumpMessages(guildId, userId) {
  await pool.query(
    `INSERT INTO user_stats (guild_id, user_id, messages, updated_at)
     VALUES ($1, $2, 1, NOW())
     ON CONFLICT (guild_id, user_id) DO UPDATE SET messages = user_stats.messages + 1, updated_at = NOW()`,
    [guildId, userId]
  );
}

async function addVoiceMinutes(guildId, userId, minutes) {
  if (!Number.isInteger(minutes) || minutes <= 0) return;
  await pool.query(
    `INSERT INTO user_stats (guild_id, user_id, voice_minutes, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (guild_id, user_id) DO UPDATE SET voice_minutes = user_stats.voice_minutes + $3, updated_at = NOW()`,
    [guildId, userId, minutes]
  );
}

async function getUserStats(guildId, userId) {
  const result = await pool.query(
    `SELECT * FROM user_stats WHERE guild_id = $1 AND user_id = $2`,
    [guildId, userId]
  );
  return result.rows[0] || { messages: 0, voice_minutes: 0 };
}

async function getCategoryTop(guildId, category, limit = 10) {
  if (category === 'level') return getLeaderboard(guildId, limit);
  const col = category === 'voice' ? 'voice_minutes' : 'messages';
  const result = await pool.query(
    `SELECT user_id, messages, voice_minutes FROM user_stats WHERE guild_id = $1 ORDER BY ${col} DESC LIMIT $2`,
    [guildId, limit]
  );
  return result.rows;
}

async function setCategoryRole(guildId, category, roleId) {
  if (!CATEGORIES.includes(category)) throw new Error('Unknown category');
  await pool.query(
    `INSERT INTO category_roles (guild_id, category, role_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (guild_id, category) DO UPDATE SET role_id = $3`,
    [guildId, category, roleId]
  );
}

async function removeCategoryRole(guildId, category) {
  await pool.query(`DELETE FROM category_roles WHERE guild_id = $1 AND category = $2`, [guildId, category]);
}

async function getCategoryRoles(guildId) {
  const result = await pool.query(`SELECT * FROM category_roles WHERE guild_id = $1`, [guildId]);
  return result.rows;
}

module.exports = {
  initLevelDatabase,
  getUserXp,
  upsertUserXp,
  getLeaderboard,
  addLevelRole,
  removeLevelRole,
  getLevelRoles,
  getLevelConfig,
  setLevelConfig,
};