const { EmbedBuilder } = require('discord.js');
const { pool } = require('@dominyx/core');
const { getGuardSettings } = require('./guardStore');

async function nextCaseNumber(guildId) {
  const result = await pool.query(
    `INSERT INTO guild_case_counters (guild_id, last_case_number)
     VALUES ($1, 1)
     ON CONFLICT (guild_id) DO UPDATE SET last_case_number = guild_case_counters.last_case_number + 1
     RETURNING last_case_number`,
    [guildId]
  );
  return result.rows[0].last_case_number;
}

async function createCase({ guildId, action, targetId, targetTag, moderatorId, moderatorTag, reason }) {
  const caseNumber = await nextCaseNumber(guildId);
  await pool.query(
    `INSERT INTO mod_cases (guild_id, case_number, action, target_id, target_tag, moderator_id, moderator_tag, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [guildId, caseNumber, action, targetId, targetTag, moderatorId, moderatorTag, reason || 'No reason provided']
  );
  return caseNumber;
}

async function getCases(guildId, targetId, limit = 10) {
  const result = await pool.query(
    `SELECT * FROM mod_cases WHERE guild_id = $1 AND target_id = $2 ORDER BY created_at DESC LIMIT $3`,
    [guildId, targetId, limit]
  );
  return result.rows;
}

async function addNote(guildId, userId, note, addedBy) {
  await pool.query(
    `INSERT INTO mod_notes (guild_id, user_id, note, added_by) VALUES ($1, $2, $3, $4)`,
    [guildId, userId, note, addedBy]
  );
}

async function getNotes(guildId, userId) {
  const result = await pool.query(
    `SELECT * FROM mod_notes WHERE guild_id = $1 AND user_id = $2 ORDER BY created_at DESC`,
    [guildId, userId]
  );
  return result.rows;
}

const EMOJIS = {
  ban: '🔨',
  kick: '👢',
  warn: '⚠️',
};

async function logCaseToChannel(client, guildId, { action, targetTag, targetId, moderatorTag, reason, caseNumber }) {
  const settings = await getGuardSettings(guildId);
  if (!settings?.modlog_channel_id) return;

  const channel = client.channels.cache.get(settings.modlog_channel_id);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0xDC143C)
    .setAuthor({ name: `Case #${caseNumber} — ${action.toUpperCase()}` })
    .setThumbnail(undefined)
    .addFields(
      { name: 'User', value: `${targetTag} (<@${targetId}>)`, inline: true },
      { name: 'Moderator', value: `${moderatorTag}`, inline: true },
      { name: 'Reason', value: reason || 'No reason provided' },
    )
    .setFooter({ text: 'Dominyx • Guard' })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { createCase, getCases, addNote, getNotes, logCaseToChannel, EMOJIS };