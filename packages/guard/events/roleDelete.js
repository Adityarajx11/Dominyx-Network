const { AuditLogEvent } = require('discord.js');
const { recordHit, alertModlog, findExecutor, stashSnapshot, rollbackBurst } = require('../lib/antinuke');
const { getGuardSettings } = require('../lib/guardStore');

module.exports = {
  name: 'roleDelete',
  async execute(role, client) {
    try {
      const guild = role.guild;
      if (!guild) return;
      if (role.managed) return; // bot/integration roles — never roll these back
      const settings = await getGuardSettings(guild.id).catch(() => null);
      if (settings && settings.antinuke_enabled === false) return;

      stashSnapshot(guild.id, { kind: 'role', data: role });
      const count = recordHit(guild.id, 'roleDelete', 30 * 1000);
      if (count === 3) {
        const exec = await findExecutor(guild, AuditLogEvent.RoleDelete);
        let restored = 0;
        if (!settings || settings.nuke_rollback !== false) {
          restored = await rollbackBurst(guild, client, guild.id);
        }
        await alertModlog(
          client,
          guild.id,
          'Possible nuke: mass role deletes',
          `3+ roles deleted in 30s (latest: **${role.name || role.id}**).${restored ? ` Rolled back **${restored}** role(s)/channel(s).` : ''}${exec ? ` Latest by **${exec.tag}** (<@${exec.id}>) — check them now.` : ''}`
        );
      }
    } catch (err) {
      console.error('Antinuke roleDelete error:', err.message);
    }
  },
};
