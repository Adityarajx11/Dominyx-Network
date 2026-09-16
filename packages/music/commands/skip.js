const { SlashCommandBuilder } = require('discord.js');
const { getManager } = require('../lib/lavalink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song'),

  async execute(interaction) {
    const player = getManager().getPlayer(interaction.guild.id);
    if (!player || !player.queue.current) {
      return interaction.reply({ content: '🚫 Nothing is playing.', ephemeral: true });
    }
    await player.skip();
    return interaction.reply('⏭️ Skipped.');
  },
};