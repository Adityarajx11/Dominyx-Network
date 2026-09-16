const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const { getConfig } = require('../lib/ticketStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Post the ticket creation panel in the current channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const config = await getConfig(guildId);

    if (!config || !config.categories || config.categories.length === 0) {
      return interaction.reply({
        content: '❌ No ticket categories configured yet. Run /ticketsetup addcategory first.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0xDC143C)
      .setTitle('🎫 Dominyx Support Tickets')
      .setDescription('**Rules**\n• Tickets are for support questions and reports only.\n• One ticket at a time — spamming tickets may get you removed.\n• Stay respectful. Staff can close any ticket.\n\nPick a category below and a private channel will open just for you.');

    if (config.banner_url) {
      embed.setImage(config.banner_url);
    }

    const options = config.categories.map((category, index) => {
      const option = { label: category.label, value: String(index) };
      if (category.emoji) option.emoji = category.emoji;
      if (category.description) option.description = category.description;
      return option;
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_create_select')
      .setPlaceholder('Choose a category...')
      .addOptions(options);

    const actionRow = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({ embeds: [embed], components: [actionRow] });
  },
};