const { AuditLogEvent } = require('discord.js');
const { recordHit, alertModlog, findExecutor } = require('../lib/antinuke');
const { getGuardSettings } = require('../lib/guardStore');

module.exports = {
  name: 'channelCreate',
  async execute(channel, client) {
    try {
      const guild = channel.guild;
      if (!guild) return;
      const settings = await getGuardSettings(guild.id).catch(() => null);
      if (settings && settings.antinuke_enabled === false) return;
      const count = recordHit(guild.id, 'channelCreate', 30 * 1000);
      if (count === 3) {
        const exec = await findExecutor(guild, AuditLogEvent.ChannelCreate);
        await alertModlog(
          client,
          guild.id,
          'Possible nuke: mass channel creates',
          `3+ channels created in 30s (latest: **#${channel.name || channel.id}**).${exec ? ` Latest by **${exec.tag}** (<@${exec.id}>) — check them now.` : ''}`
        );
      }
    } catch (err) {
      console.error('Antinuke channelCreate error:', err.message);
    }
  },
};
