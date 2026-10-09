const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getManager, requesterMention } = require('../lib/lavalink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing song'),

  async execute(interaction) {
    let player;
    try {
      player = getManager()?.getPlayer(interaction.guild.id);
    } catch {
      player = null;
    }
    if (!player || !player.queue.current) {
      return interaction.reply({ content: '📭 Nothing is playing.', flags: MessageFlags.Ephemeral });
    }
    const track = player.queue.current;
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🎵 Now Playing')
      .setDescription(`**${track.info?.title || 'Unknown'}**`)
      .addFields(
        { name: 'Requested by', value: `${requesterMention(track)}`, inline: true },
        { name: 'Loop', value: String(player.repeatMode ?? 'off'), inline: true },
        { name: 'Volume', value: `${player.volume ?? 100}%`, inline: true },
      );
    const sent = await interaction.reply({ embeds: [embed] });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 120000);
    return sent;
  },
};
