const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getManager } = require('../lib/lavalink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Loop off, one song, or whole queue')
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
      return interaction.reply({ content: '🚫 Nothing is playing.', flags: MessageFlags.Ephemeral });
    }
    const mode = interaction.options.getString('mode');
    player.setRepeatMode(mode);
    return interaction.reply({ content: `🔁 Loop mode set to **${mode}**.`, flags: MessageFlags.Ephemeral });
  },
};

