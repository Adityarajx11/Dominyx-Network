const { SlashCommandBuilder } = require('discord.js');
const { getManager } = require('../lib/lavalink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle the upcoming songs in the queue'),

  async execute(interaction) {
    const player = getManager().getPlayer(interaction.guild.id);
    if (!player || player.queue.tracks.length < 2) {
      return interaction.reply({ content: '🚫 Not enough songs in queue to shuffle.', ephemeral: true });
    }
    await player.queue.shuffle();
    return interaction.reply('🔀 Queue shuffled.');
  },
};