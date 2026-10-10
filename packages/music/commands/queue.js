const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getManager, requesterMention } = require('../lib/lavalink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show what is playing and up next'),

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
      const cur = player.queue.current;
      lines.push(`▶️ **${cur.info?.title || 'Unknown'}** — requested by ${requesterMention(cur)}`);
    }
    player.queue.tracks.slice(0, 15).forEach((t, i) => {
      lines.push(`${i + 1}. **${t.info?.title || 'Unknown'}** — requested by ${requesterMention(t)}`);
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🎶 Current Queue')
      .setDescription(lines.join('\n').slice(0, 4000))
      .setFooter({ text: `${player.queue.tracks.length} upcoming • Loop: ${String(player.repeatMode ?? 'off')}` });

    const sent = await interaction.reply({ embeds: [embed] });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 120000);
    return sent;
  },
};
