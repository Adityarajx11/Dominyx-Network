const { SlashCommandBuilder } = require('discord.js');
const { getManager } = require('../lib/lavalink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set the playback volume (0-200%)')
    .addIntegerOption(opt =>
      opt.setName('percent')
        .setDescription('Volume percentage, e.g. 100')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(200)),

  async execute(interaction) {
    const player = getManager().getPlayer(interaction.guild.id);
    if (!player) {
      return interaction.reply({ content: '🚫 Nothing is playing.', ephemeral: true });
    }
    const percent = interaction.options.getInteger('percent');
    await player.setVolume(percent);
    return interaction.reply(`🔊 Volume set to ${percent}%.`);
  },
};