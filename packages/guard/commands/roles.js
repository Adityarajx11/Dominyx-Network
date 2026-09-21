const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');
const { getGuardSettings } = require('../lib/guardStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Browse and pick self-assignable roles for this server'),

  async execute(interaction) {
    const settings = await getGuardSettings(interaction.guild.id);
    const categories = settings?.self_role_categories || {};
    const categoryNames = Object.keys(categories);

    if (categoryNames.length === 0) {
      return interaction.reply({ content: '📭 No self-assignable roles have been set up yet.', flags: MessageFlags.Ephemeral });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('selfrole_category')
      .setPlaceholder('Choose a category...')
      .addOptions(
        categoryNames.slice(0, 25).map(name => ({
          label: name,
          value: name,
          description: `${categories[name].length} role(s)`,
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.reply({
      content: '🎭 Pick a category to see available roles:',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
};
