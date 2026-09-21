const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getManager } = require('../lib/lavalink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback and clear the queue'),

  async execute(interaction) {
    const player = getManager().getPlayer(interaction.guild.id);
    if (!player) {
      return interaction.reply({ content: '🚫 Nothing is playing.', flags: MessageFlags.Ephemeral });
    }
    player.queue.tracks.splice(0, player.queue.tracks.length);
    await player.stopPlaying(true);
    return interaction.reply('⏹️ Stopped and cleared the queue.');
  },
};
