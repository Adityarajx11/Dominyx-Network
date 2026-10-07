const { SlashCommandBuilder } = require('discord.js');
const { get247, set247, getMusicSettings } = require('../lib/settings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('247')
    .setDescription('Toggle 24/7 mode so the bot never auto-leaves voice'),

  async execute(interaction) {
    let current = false;
    try {
      current = await get247(interaction.guild.id);
    } catch {
      return interaction.reply('⚠️ Database is unreachable — try again in a bit.');
    }
    const next = !current;
    try {
      await set247(interaction.guild.id, next);
    } catch {
      return interaction.reply('⚠️ Could not save — database is unreachable.');
    }
    let mins = 5;
    try {
      mins = (await getMusicSettings(interaction.guild.id)).leaveTimeoutMinutes ?? 5;
    } catch {}

    return interaction.reply(
      next
        ? '✅ 24/7 mode **enabled** — I\'ll stay connected even when the queue is empty.'
        : `☑️ 24/7 mode **disabled** — I\'ll leave after ${mins} minute(s) of an empty queue.`
    );
  },
};