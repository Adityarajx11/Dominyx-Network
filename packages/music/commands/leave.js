const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getManager, cancelLeave } = require('../lib/lavalink');
const { requireDj } = require('../lib/settings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Make the bot leave the voice channel and clear the queue'),

  async execute(interaction) {
    if (!(await requireDj(interaction))) return;

    const player = getManager().getPlayer(interaction.guild.id);
    if (!player) {
      return interaction.reply({ content: "🚫 I'm not in a voice channel.", flags: MessageFlags.Ephemeral });
    }

    cancelLeave(interaction.guild.id);
    try {
      await player.destroy();
    } catch {}
    return interaction.reply('👋 Left the voice channel and cleared the queue.');
  },
};
