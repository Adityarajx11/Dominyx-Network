const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCase, logCaseToChannel, getCases } = require('../lib/modlog');
const { getGuardSettings } = require('../lib/guardStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member (logged as a case, no punishment applied)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the warning').setRequired(true)),

  async execute(interaction, client) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    const caseNumber = await createCase({
      guildId: interaction.guild.id,
      action: 'warn',
      targetId: target.id,
      targetTag: target.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      reason,
    });

    target.send(`⚠️ You were warned in **${interaction.guild.name}**: ${reason}`).catch(() => {});

    await logCaseToChannel(client, interaction.guild.id, {
      action: 'warn', targetTag: target.tag, targetId: target.id, moderatorTag: interaction.user.tag, reason, caseNumber,
    });

    // Warn ladder: auto-mute / auto-ban at configured thresholds.
    let ladderMsg = '';
    try {
      const settings = await getGuardSettings(interaction.guild.id);
      const muteAt = Number.isInteger(settings?.warns_mute) ? settings.warns_mute : 3;
      const banAt = Number.isInteger(settings?.warns_ban) ? settings.warns_ban : 5;
      const cases = await getCases(interaction.guild.id, target.id, 50).catch(() => []);
      const warnCount = cases.filter((c) => c.action === 'warn').length;
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);

      if (member && banAt > 0 && warnCount >= banAt) {
        await member.ban({ reason: `Warn ladder: ${warnCount} warnings` }).catch(() => {});
        ladderMsg = ` Reached **${warnCount}** warnings — **banned** automatically.`;
      } else if (member && muteAt > 0 && warnCount >= muteAt && settings?.mute_role_id) {
        const muteRole = interaction.guild.roles.cache.get(settings.mute_role_id);
        if (muteRole && !member.roles.cache.has(muteRole.id)) {
          await member.roles.add(muteRole, `Warn ladder: ${warnCount} warnings`).catch(() => {});
          ladderMsg = ` Reached **${warnCount}** warnings — **muted** automatically.`;
        }
      }
    } catch {}

    return interaction.reply(`⚠️ Warned **${target.tag}**. Case #${caseNumber}. Reason: ${reason}.${ladderMsg}`);
  },
};