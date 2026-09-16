const { SlashCommandBuilder } = require('discord.js');
const { getManager } = require('../lib/lavalink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set loop mode')
    .addStringOption(opt =>
      opt.setName('mode')
        .setDescription('off, track, or queue')
        .setRequired(true)
        .addChoices(
          { name: 'Off', value: 'off' },
          { name: 'Current song', value: 'track' },
          { name: 'Whole queue', value: 'queue' },
        )),

  async execute(interaction) {
    const player = getManager().getPlayer(interaction.guild.id);
    if (!player) {
      return interaction.reply({ content: '🚫 Nothing is playing.', ephemeral: true });
    }
    const mode = interaction.options.getString('mode');
    player.setRepeatMode(mode);
    return interaction.reply(`🔁 Loop mode set to **${mode}**.`);
  },
};