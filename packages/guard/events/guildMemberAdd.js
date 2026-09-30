const { getGuardSettings } = require('../lib/guardStore');
const { createCase, logCaseToChannel } = require('../lib/modlog');
const { alertModlog } = require('../lib/antinuke');

// Join-burst windows per guild for raid detection (in-memory).
const joins = new Map(); // guildId -> number[]
const raidUntil = new Map(); // guildId -> timestamp

function pruneJoins(guildId, windowMs) {
  const now = Date.now();
  const list = (joins.get(guildId) || []).filter((t) => now - t < windowMs);
  joins.set(guildId, list);
  return list;
}

async function punishJoiner(client, guild, member, action, reason) {
  const tag = member.user.tag;
  if (action === 'timeout') {
    try {
      await member.timeout(10 * 60 * 1000, `Guard: ${reason}`).catch(() => null);
    } catch {}
  } else {
    try {
      await member.kick(`Guard: ${reason}`).catch(() => null);
    } catch {}
  }
  const caseNumber = await createCase({
    guildId: guild.id,
    action: action === 'timeout' ? 'raid_timeout' : 'raid_kick',
    targetId: member.id,
    targetTag: tag,
    moderatorId: client.user.id,
    moderatorTag: client.user.tag,
    reason,
  }).catch(() => null);
  await logCaseToChannel(client, guild.id, {
    action: action === 'timeout' ? 'raid_timeout' : 'raid_kick',
    targetTag: tag,
    targetId: member.id,
    moderatorTag: client.user.tag,
    reason,
    caseNumber,
  }).catch(() => {});
}

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    try {
      const guild = member.guild;
      if (!guild) return;
      const settings = await getGuardSettings(guild.id).catch(() => null);
      if (!settings) return;

      // Flag bot adds so owners see who invited them.
      if (member.user.bot) {
        await alertModlog(client, guild.id, 'Bot added', `**${member.user.tag}** (<@${member.id}>) joined. Remove it if you didn't invite it.`).catch(() => {});
        return;
      }

      // New-account age gate.
      const minDays = Number.isInteger(settings.min_account_age_days) ? settings.min_account_age_days : 0;
      if (minDays > 0) {
        const ageMs = Date.now() - member.user.createdTimestamp;
        if (ageMs < minDays * 24 * 60 * 60 * 1000) {
          const action = settings.age_action === 'timeout' ? 'timeout' : 'kick';
          await punishJoiner(client, guild, member, action, `account younger than ${minDays} day(s)`);
          return;
        }
      }

      // Raid: join burst detection.
      if (!settings.raid_enabled) return;
      const need = Number.isInteger(settings.raid_joins) ? settings.raid_joins : 5;
      const windowSec = Number.isInteger(settings.raid_seconds) ? settings.raid_seconds : 10;
      const cooldownMin = Number.isInteger(settings.raid_cooldown_minutes) ? settings.raid_cooldown_minutes : 10;
      const action = settings.raid_action === 'timeout' ? 'timeout' : 'kick';

      const now = Date.now();
      if ((raidUntil.get(guild.id) || 0) > now) {
        await punishJoiner(client, guild, member, action, 'raid mode active (join burst)');
        return;
      }

      const list = pruneJoins(guild.id, windowSec * 1000);
      list.push(now);
      joins.set(guild.id, list);
      if (list.length >= need) {
        raidUntil.set(guild.id, now + cooldownMin * 60 * 1000);
        joins.set(guild.id, []);
        await alertModlog(
          client,
          guild.id,
          'Raid detected',
          `${list.length} joins in ${windowSec}s — raid mode ON for ${cooldownMin} min. New joins get **${action}ed** automatically.`
        ).catch(() => {});
        await punishJoiner(client, guild, member, action, `raid burst (${list.length} joins/${windowSec}s)`);
      }
    } catch (err) {
      console.error('Raid/age-gate error:', err.message);
    }
  },
};
