const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getManager } = require('../lib/lavalink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing song'),

  async execute(interaction) {
    const player = getManager().getPlayer(interaction.guild.id);
    if (!player || !player.queue.current) {
      return interaction.reply({ content: '📭 Nothing is playing.', ephemeral: true });
    }
    const track = player.queue.current;
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🎵 Now Playing')
      .setDescription(`**${track.info.title}**`)
      .addFields(
        { name: 'Requested by', value: `${track.requester}`, inline: true },
        { name: 'Loop', value: player.repeatMode, inline: true },
        { name: 'Volume', value: `${player.volume}%`, inline: true },
      );
    return interaction.reply({ embeds: [embed] });
  },
};