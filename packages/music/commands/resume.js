const { SlashCommandBuilder } = require('discord.js');
const { getManager } = require('../lib/lavalink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the paused song'),

  async execute(interaction) {
    const player = getManager().getPlayer(interaction.guild.id);
    if (!player) {
      return interaction.reply({ content: '🚫 Nothing is playing.', ephemeral: true });
    }
    await player.resume();
    return interaction.reply('▶️ Resumed.');
  },
};