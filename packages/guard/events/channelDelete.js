const { AuditLogEvent } = require('discord.js');
const { recordHit, alertModlog, findExecutor, stashSnapshot, rollbackBurst } = require('../lib/antinuke');
const { getGuardSettings } = require('../lib/guardStore');

module.exports = {
  name: 'channelDelete',
  async execute(channel, client) {
    try {
      const guild = channel.guild;
      if (!guild) return;
      const settings = await getGuardSettings(guild.id).catch(() => null);
      if (settings && settings.antinuke_enabled === false) return;

      stashSnapshot(guild.id, { kind: 'channel', data: channel });
      const count = recordHit(guild.id, 'channelDelete', 30 * 1000);
      if (count === 3) {
        const exec = await findExecutor(guild, AuditLogEvent.ChannelDelete);
        let restored = 0;
        if (!settings || settings.nuke_rollback !== false) {
          restored = await rollbackBurst(guild, client, guild.id, 'channel');
        }
        await alertModlog(
          client,
          guild.id,
          'Possible nuke: mass channel deletes',
          `3+ channels deleted in 30s (latest: **#${channel.name || channel.id}**).${restored ? ` Rolled back **${restored}** channel(s).` : ''}${exec ? ` Latest by **${exec.tag}** (<@${exec.id}>) — check them now.` : ''}`
        );
      }
    } catch (err) {
      console.error('Antinuke channelDelete error:', err.message);
    }
  },
};
