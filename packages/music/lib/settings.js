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
  await pool.query(`ALTER TABLE music_settings ADD COLUMN IF NOT EXISTS default_volume INTEGER DEFAULT 100;`);
  await pool.query(`ALTER TABLE music_settings ADD COLUMN IF NOT EXISTS dj_role_id TEXT;`);
  await pool.query(`ALTER TABLE music_settings ADD COLUMN IF NOT EXISTS max_queue INTEGER DEFAULT 50;`);
  await pool.query(`ALTER TABLE music_settings ADD COLUMN IF NOT EXISTS leave_timeout_minutes INTEGER DEFAULT 5;`);
  await pool.query(`ALTER TABLE music_settings ADD COLUMN IF NOT EXISTS announce_channel_id TEXT;`);
  console.log('🎵 Music settings table ready.');
}

const MUSIC_DEFAULTS = {
  stay247: false,
  defaultVolume: 100,
  djRoleId: null,
  maxQueue: 50,
  leaveTimeoutMinutes: 5,
  announceChannelId: null,
};

async function getMusicSettings(guildId) {
  try {
    const result = await pool.query('SELECT * FROM music_settings WHERE guild_id = $1', [guildId]);
    const row = result.rows[0];
    if (!row) return { ...MUSIC_DEFAULTS };
    return {
      stay247: row.stay_247 ?? false,
      defaultVolume: Number.isInteger(row.default_volume) ? row.default_volume : 100,
      djRoleId: row.dj_role_id || null,
      maxQueue: Number.isInteger(row.max_queue) ? row.max_queue : 50,
      leaveTimeoutMinutes: Number.isInteger(row.leave_timeout_minutes) ? row.leave_timeout_minutes : 5,
      announceChannelId: row.announce_channel_id || null,
    };
  } catch (err) {
    console.error('Failed to get music settings:', err.message);
    return { ...MUSIC_DEFAULTS };
  }
}

// Returns true if allowed. Replies + returns false when a DJ role is set and the member lacks it.
// Server admins always pass.
async function requireDj(interaction) {
  try {
    if (interaction.memberPermissions?.has('Administrator')) return true;
    const settings = await getMusicSettings(interaction.guild.id);
    if (!settings.djRoleId) return true;
    const member = interaction.member;
    if (member?.roles?.cache?.has(settings.djRoleId)) return true;
    const roleName = interaction.guild?.roles?.cache?.get(settings.djRoleId)?.name || 'DJ';
    await interaction.reply({
      content: `🚫 You need the **${roleName}** role to control the music.`,
      flags: require('discord.js').MessageFlags.Ephemeral,
    }).catch(() => {});
    return false;
  } catch {
    return true;
  }
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

module.exports = { initMusicSettings, get247, set247, getMusicSettings, requireDj, MUSIC_DEFAULTS };