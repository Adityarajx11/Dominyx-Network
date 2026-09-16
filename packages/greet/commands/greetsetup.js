const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { getGreetSettings, updateGreetSettings } = require('../lib/settings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('greetsetup')
    .setDescription('Admin only: configure the welcome system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('channel')
        .setDescription('Set the welcome channel')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel for welcome messages')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('message')
        .setDescription('Set the welcome text (use {user}, {server}, {membercount})')
        .addStringOption(opt =>
          opt.setName('text')
            .setDescription('Welcome template')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('autorole')
        .setDescription('Set the auto-assign role for new members')
        .addRoleOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('card')
        .setDescription('Toggle the welcome card image')
        .addBooleanOption(opt =>
          opt.setName('enabled').setDescription('true = card on, false = text only').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('show')
        .setDescription('Show current welcome configuration')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    const footer = { text: 'Dominyx • Greet', iconURL: interaction.client.user.displayAvatarURL() };

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel');
      await updateGreetSettings(guildId, { welcomeChannelId: channel.id });
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xDC143C)
          .setTitle('✅ Welcome Channel Set')
          .setDescription(`Welcome messages will post in ${channel}.`)
          .setFooter(footer)
          .setTimestamp()],
      });
    }

    if (sub === 'message') {
      const text = interaction.options.getString('text');
      await updateGreetSettings(guildId, { welcomeMessage: text });
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xDC143C)
          .setTitle('✅ Welcome Message Set')
          .setDescription(`Template saved:\n${text}`)
          .setFooter(footer)
          .setTimestamp()],
      });
    }

    if (sub === 'autorole') {
      const role = interaction.options.getRole('role');
      await updateGreetSettings(guildId, { autoRoleId: role.id });
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xDC143C)
          .setTitle('✅ Auto-Role Set')
          .setDescription(`New members will get **${role.name}**.`)
          .setFooter(footer)
          .setTimestamp()],
      });
    }

    if (sub === 'card') {
      const enabled = interaction.options.getBoolean('enabled');
      await updateGreetSettings(guildId, { cardEnabled: enabled });
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xDC143C)
          .setTitle(enabled ? '✅ Card Enabled' : '☑️ Card Disabled')
          .setDescription(enabled ? 'Welcome card image will be posted.' : 'Text-only welcome messages.')
          .setFooter(footer)
          .setTimestamp()],
      });
    }

    if (sub === 'show') {
      const settings = await getGreetSettings(guildId);
      const cardText = settings.cardEnabled === false ? 'Off' : 'On';
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xDC143C)
          .setTitle('👋 Welcome Configuration')
          .addFields(
            { name: 'Welcome Channel', value: settings.welcomeChannelId ? `<#${settings.welcomeChannelId}>` : 'Not set' },
            { name: 'Message Template', value: settings.welcomeMessage || 'Default' },
            { name: 'Auto-Role', value: settings.autoRoleId ? `<@&${settings.autoRoleId}>` : 'None' },
            { name: 'Card', value: cardText },
          )
          .setFooter(footer)
          .setTimestamp()],
      });
    }
  },
};