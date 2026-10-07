const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');
const { getConfig } = require('../lib/ticketStore');

// Accepts unicode emoji or custom <:name:id> / <a:name:id>; anything else is dropped.
function parseMenuEmoji(input) {
  if (!input || typeof input !== 'string') return null;
  const custom = input.match(/^<a?:\w+:(\d+)>$/);
  if (custom) return { id: custom[1] };
  if (/\p{Extended_Pictographic}/u.test(input)) return input;
  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Post the ticket creation panel in the current channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Server-only command.', flags: MessageFlags.Ephemeral });
    }
    const guildId = interaction.guild.id;
    const config = await getConfig(guildId);

    if (!config || !config.categories || config.categories.length === 0) {
      return interaction.reply({
        content: '❌ No ticket categories configured yet. Run /ticketsetup addcategory first.',
        flags: MessageFlags.Ephemeral,
      });
    }
    if (!config.category_channel_id || !config.staff_role_id) {
      return interaction.reply({
        content: '❌ Finish setup first: `/ticketsetup category` (parent) and `/ticketsetup staffrole`.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0xDC143C)
      .setTitle(config.panel_title || '🎫 Dominyx Support Tickets')
      .setDescription(config.panel_rules || '**Rules**\n• Tickets are for support questions and reports only.\n• One ticket at a time — spamming tickets may get you removed.\n• Stay respectful. Staff can close any ticket.\n\nPick a category below and a private channel will open just for you.');

    if (config.banner_url) {
      embed.setImage(config.banner_url);
    }

    const options = config.categories.slice(0, 25).map((category, index) => {
      const option = {
        label: String(category.label || `Option ${index + 1}`).slice(0, 100),
        value: String(index),
      };
      const emoji = parseMenuEmoji(category.emoji);
      if (emoji) option.emoji = emoji;
      if (category.description) option.description = String(category.description).slice(0, 100);
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
