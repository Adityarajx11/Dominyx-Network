const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createCase, logCaseToChannel } = require('../lib/modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(opt => opt.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the ban').setRequired(false)),

  async execute(interaction, client) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (member && !member.bannable) {
      return interaction.reply({ content: '🚫 I can\'t ban that user (role hierarchy or permissions).', ephemeral: true });
    }

    try {
      await interaction.guild.members.ban(target.id, { reason });
      const caseNumber = await createCase({
        guildId: interaction.guild.id,
        action: 'ban',
        targetId: target.id,
        targetTag: target.tag,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        reason,
      });
      await logCaseToChannel(client, interaction.guild.id, {
        action: 'ban', targetTag: target.tag, targetId: target.id, moderatorTag: interaction.user.tag, reason, caseNumber,
      });
      return interaction.reply(`🔨 Banned **${target.tag}**. Case #${caseNumber}. Reason: ${reason}`);
    } catch (err) {
      return interaction.reply({ content: `⚠️ Failed to ban: ${err.message}`, ephemeral: true });
    }
  },
};