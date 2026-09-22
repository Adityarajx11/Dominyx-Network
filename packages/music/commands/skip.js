const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getManager } = require('../lib/lavalink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song'),

  async execute(interaction) {
    const player = getManager().getPlayer(interaction.guild.id);
    if (!player || !player.queue.current) {
      return interaction.reply({ content: '🚫 Nothing is playing.', flags: MessageFlags.Ephemeral });
    }
    try {
      // (0, false): skipping the last song just ends it instead of throwing
      // "Can't skip more than the queue size".
      await player.skip(0, false);
    } catch (err) {
      return interaction.reply({ content: `❌ Skip failed: ${err.message || err}`, flags: MessageFlags.Ephemeral });
    }
    return interaction.reply('⏭️ Skipped.');
  },
};
