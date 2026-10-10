const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getBoard, currentSeason } = require('../lib/musicXp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('music-leaderboard')
    .setDescription('Top music XP fans — season or lifetime')
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
    await interaction.deferReply();

    let board;
    try {
      board = await getBoard(interaction.guild.id, period, 10);
    } catch {
      return interaction.editReply({ content: '⚠️ Board unavailable — database is unreachable.' });
    }
    if (board.length === 0) {
      return interaction.editReply({ content: '📭 No XP yet — request a song to earn (+10, +5 for a new artist).' });
    }
    const medals = ['🥇', '🥈', '🥉'];
    const lines = board.map((u, i) => {
      const rank = medals[i] || `**${i + 1}.**`;
      return `${rank} <@${u.user_id}> — **${u.xp} XP** · ${u.songs_requested} songs`;
    });
    const linesText = lines.join('\n').slice(0, 3500);
    const top = board[0];
    const embed = new EmbedBuilder()
      .setColor(0xF59E0B)
      .setTitle(`🏆 Music leaderboard — ${period === 'season' ? 'this season' : 'lifetime'}`)
      .setDescription(`*${interaction.guild.name} · 👑 leader: <@${top.user_id}> with **${top.xp} XP***\n\n${linesText}`)
      .setThumbnail(interaction.guild.iconURL() ?? undefined)
      .setFooter({ text: `Dominyx • Music XP • +10/song, +5 new artist • season ${currentSeason()}`, iconURL: interaction.client.user.displayAvatarURL() })
      .setTimestamp();
    const sent = await interaction.editReply({ embeds: [embed] });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 120000);
    return sent;
  },
};
