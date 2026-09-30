const { AuditLogEvent } = require('discord.js');
const { recordHit, alertModlog, findExecutor, punishNuker } = require('../lib/antinuke');
const { getGuardSettings } = require('../lib/guardStore');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban, client) {
    try {
      const guild = ban.guild;
      if (!guild) return;
      const settings = await getGuardSettings(guild.id).catch(() => null);
      if (settings && settings.antinuke_enabled === false) return;

      const count = recordHit(guild.id, 'bans', 30 * 1000);
      if (count === 3) {
        const exec = await findExecutor(guild, AuditLogEvent.MemberBanAdd);
        let punished = '';
        const action = settings?.nuke_action;
        if ((action === 'timeout' || action === 'ban') && exec) {
          const ok = await punishNuker(guild, exec, action);
          if (ok) punished = ` Nuker **${exec.tag}** auto-${action === 'ban' ? 'banned' : 'timed out (1h)'}.`;
        }
        await alertModlog(
          client,
          guild.id,
          'Possible nuke: mass bans',
          `3+ bans in 30s (target: **${ban.user?.tag || ban.user?.id}**).${punished}${exec && !punished ? ` Latest by **${exec.tag}** (<@${exec.id}>) — check them now.` : ''}`
        );
      }
    } catch (err) {
      console.error('Antinuke ban error:', err.message);
    }
  },
};
