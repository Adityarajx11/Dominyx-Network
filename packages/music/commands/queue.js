const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getManager } = require('../lib/lavalink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current song queue'),

  async execute(interaction) {
    const player = getManager().getPlayer(interaction.guild.id);
    if (!player || (!player.queue.current && player.queue.tracks.length === 0)) {
      return interaction.reply({ content: '📭 The queue is empty.', ephemeral: true });
    }

    const lines = [];
    if (player.queue.current) {
      lines.push(`▶️ **${player.queue.current.info.title}** — requested by ${player.queue.current.requester}`);
    }
    player.queue.tracks.slice(0, 15).forEach((t, i) => {
      lines.push(`${i + 1}. **${t.info.title}** — requested by ${t.requester}`);
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🎶 Current Queue')
      .setDescription(lines.join('\n'))
      .setFooter({ text: `${player.queue.tracks.length} upcoming • Loop: ${player.repeatMode}` });

    return interaction.reply({ embeds: [embed] });
  },
};