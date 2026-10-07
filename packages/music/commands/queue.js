const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getManager } = require('../lib/lavalink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current song queue'),

  async execute(interaction) {
    let player;
    try {
      player = getManager()?.getPlayer(interaction.guild.id);
    } catch {
      player = null;
    }
    if (!player || (!player.queue.current && player.queue.tracks.length === 0)) {
      return interaction.reply({ content: '📭 The queue is empty.', flags: MessageFlags.Ephemeral });
    }

    const lines = [];
    if (player.queue.current) {
      lines.push(`▶️ **${player.queue.current.info?.title || 'Unknown'}** — requested by ${player.queue.current.requester || 'someone'}`);
    }
    player.queue.tracks.slice(0, 15).forEach((t, i) => {
      lines.push(`${i + 1}. **${t.info?.title || 'Unknown'}** — requested by ${t.requester || 'someone'}`);
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🎶 Current Queue')
      .setDescription(lines.join('\n').slice(0, 4000))
      .setFooter({ text: `${player.queue.tracks.length} upcoming • Loop: ${String(player.repeatMode ?? 'off')}` });

    return interaction.reply({ embeds: [embed] });
  },
};
