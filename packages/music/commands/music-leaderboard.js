const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getBoard } = require('../lib/musicXp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('music-leaderboard')
    .setDescription('Top music XP earners')
    .addStringOption(opt =>
      opt.setName('period')
        .setDescription('Season (this month) or lifetime')
        .addChoices(
          { name: 'This season', value: 'season' },
          { name: 'Lifetime', value: 'all' },
        )),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Server-only command.', flags: MessageFlags.Ephemeral });
    }
    const period = interaction.options.getString('period') || 'season';
    let board;
    try {
      board = await getBoard(interaction.guild.id, period, 10);
    } catch {
      return interaction.reply({ content: '⚠️ Board unavailable — database is unreachable.', flags: MessageFlags.Ephemeral });
    }
    if (board.length === 0) {
      return interaction.reply({ content: '📭 No XP yet — request a song to earn (+10, +5 for a new artist).', flags: MessageFlags.Ephemeral });
    }
    const medals = ['🥇', '🥈', '🥉'];
    const lines = board.map((u, i) => {
      const rank = medals[i] || `${i + 1}.`;
      return `${rank} <@${u.user_id}> — **${u.xp}** XP (${u.songs_requested} songs)`;
    });
    const embed = new EmbedBuilder()
      .setColor(0xF59E0B)
      .setTitle(`🏆 Music XP — ${period === 'season' ? 'this season' : 'lifetime'}`)
      .setDescription(lines.join('\n'))
      .setFooter({ text: 'Dominyx • Music XP' })
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  },
};
