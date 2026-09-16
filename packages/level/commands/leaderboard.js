const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('../lib/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the top members by level/XP'),

  async execute(interaction) {
    const top = await getLeaderboard(interaction.guild.id, 10);

    if (top.length === 0) {
      return interaction.reply({ content: '📭 No one has earned XP yet.', ephemeral: true });
    }

    const medals = ['🥇', '🥈', '🥉'];
    const lines = top.map((u, i) => {
      const rank = medals[i] || `${i + 1}.`;
      return `${rank} <@${u.user_id}> — Level **${u.level}** (${u.xp} XP)`;
    });

    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle(`🏆 ${interaction.guild.name} Leaderboard`)
      .setDescription(lines.join('\n'))
      .setThumbnail(interaction.guild.iconURL())
      .setFooter({ text: 'Dominyx • Leaderboard', iconURL: interaction.client.user.displayAvatarURL() })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};