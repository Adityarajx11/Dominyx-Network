const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createCase, logCaseToChannel } = require('../lib/modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(opt => opt.setName('user').setDescription('User to kick').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the kick').setRequired(false)),

  async execute(interaction, client) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: '🚫 That user isn\'t in this server.', flags: MessageFlags.Ephemeral });
    }
    if (!member.kickable) {
      return interaction.reply({ content: '🚫 I can\'t kick that user (role hierarchy or permissions).', flags: MessageFlags.Ephemeral });
    }

    try {
      await member.kick(reason);
      const caseNumber = await createCase({
        guildId: interaction.guild.id,
        action: 'kick',
        targetId: target.id,
        targetTag: target.tag,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        reason,
      });
      await logCaseToChannel(client, interaction.guild.id, {
        action: 'kick', targetTag: target.tag, targetId: target.id, moderatorTag: interaction.user.tag, reason, caseNumber,
      });
      return interaction.reply(`👢 Kicked **${target.tag}**. Case #${caseNumber}. Reason: ${reason}`);
    } catch (err) {
      return interaction.reply({ content: `⚠️ Failed to kick: ${err.message}`, flags: MessageFlags.Ephemeral });
    }
  },
};
