const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getCases } = require('../lib/modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cases')
    .setDescription('Show moderation case history for a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const cases = await getCases(interaction.guild.id, target.id);

    if (cases.length === 0) {
      return interaction.reply({ content: `📭 No case history for **${target.tag}**.`, ephemeral: true });
    }

    const text = cases.map(c =>
      `**#${c.case_number}** — ${c.action.toUpperCase()} by ${c.moderator_tag}\n${c.reason}\n<t:${Math.floor(new Date(c.created_at).getTime() / 1000)}:R>`
    ).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(0xDC143C)
      .setTitle(`📋 Case History — ${target.tag}`)
      .setDescription(text.slice(0, 4000))
      .setFooter({ text: 'Dominyx • Guard' });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};