const { SlashCommandBuilder } = require('discord.js');
const { get247, set247 } = require('../lib/settings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('247')
    .setDescription('Toggle 24/7 mode so the bot never auto-leaves voice'),

  async execute(interaction) {
    const current = await get247(interaction.guild.id);
    const next = !current;
    await set247(interaction.guild.id, next);

    return interaction.reply(
      next
        ? '✅ 24/7 mode **enabled** — I\'ll stay connected even when the queue is empty.'
        : '☑️ 24/7 mode **disabled** — I\'ll leave after 5 minutes of an empty queue.'
    );
  },
};