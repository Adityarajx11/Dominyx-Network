const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getManager } = require('../lib/lavalink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current song'),

  async execute(interaction) {
    const player = getManager().getPlayer(interaction.guild.id);
    if (!player || !player.queue.current) {
      return interaction.reply({ content: '🚫 Nothing is playing.', flags: MessageFlags.Ephemeral });
    }
    await player.pause();
    return interaction.reply('⏸️ Paused.');
  },
};
