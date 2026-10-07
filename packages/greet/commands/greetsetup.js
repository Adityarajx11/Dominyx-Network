const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');
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
      sub.setName('theme')
        .setDescription('Card color theme')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('crimson, gold, violet, or ocean')
            .setRequired(true)
            .addChoices(
              { name: 'Crimson', value: 'crimson' },
              { name: 'Gold', value: 'gold' },
              { name: 'Violet', value: 'violet' },
              { name: 'Ocean', value: 'ocean' })))
    .addSubcommand(sub =>
      sub.setName('goodbye')
        .setDescription('Farewell channel + message (empty message = keep old)')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Goodbye posts go here (omit to keep)')
            .addChannelTypes(ChannelType.GuildText))
        .addStringOption(opt =>
          opt.setName('message')
            .setDescription('Use {user}, {server}, {membercount}')))
    .addSubcommand(sub =>
      sub.setName('dm')
        .setDescription('Also DM the welcome text to new members')
        .addBooleanOption(opt =>
          opt.setName('enabled').setDescription('true = DM on').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('bots')
        .setDescription('Also greet bot joins with messages/cards')
        .addBooleanOption(opt =>
          opt.setName('enabled').setDescription('true = greet bots too').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('show')
        .setDescription('Show current welcome configuration')),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Server-only command.', flags: MessageFlags.Ephemeral });
    }
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

    if (sub === 'theme') {
      const name = interaction.options.getString('name');
      await updateGreetSettings(guildId, { cardTheme: name });
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xDC143C)
          .setTitle('✅ Card Theme Set')
          .setDescription(`Welcome cards now use **${name}**.`)
          .setFooter(footer)
          .setTimestamp()],
      });
    }

    if (sub === 'goodbye') {
      const channel = interaction.options.getChannel('channel');
      const message = interaction.options.getString('message');
      const patch = {};
      if (channel) patch.goodbyeChannelId = channel.id;
      if (message) patch.goodbyeMessage = message;
      if (Object.keys(patch).length === 0) {
        return interaction.reply({ content: '❌ Give a channel, a message, or both.', flags: MessageFlags.Ephemeral });
      }
      await updateGreetSettings(guildId, patch);
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xDC143C)
          .setTitle('✅ Goodbye Set')
          .setDescription(`Farewells ${channel ? `post in ${channel}` : 'keep their channel'}${message ? ' with a new message' : ''}.`)
          .setFooter(footer)
          .setTimestamp()],
      });
    }

    if (sub === 'dm') {
      const enabled = interaction.options.getBoolean('enabled');
      await updateGreetSettings(guildId, { dmWelcome: enabled });
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xDC143C)
          .setTitle(enabled ? '✅ DM Welcome On' : '☑️ DM Welcome Off')
          .setDescription(enabled ? 'New members also get the welcome text in DMs.' : 'No more welcome DMs.')
          .setFooter(footer)
          .setTimestamp()],
      });
    }

    if (sub === 'bots') {
      const enabled = interaction.options.getBoolean('enabled');
      await updateGreetSettings(guildId, { greetBots: enabled });
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xDC143C)
          .setTitle(enabled ? '✅ Bot Greetings On' : '☑️ Bot Greetings Off')
          .setDescription(enabled ? 'Bot joins get messages and cards too (auto-role always applies).' : 'Bots only get the auto-role.')
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
            { name: 'Card', value: `${cardText} (${settings.cardTheme || 'crimson'})` },
            { name: 'Goodbye Channel', value: settings.goodbyeChannelId ? `<#${settings.goodbyeChannelId}>` : 'Not set' },
            { name: 'Goodbye Message', value: settings.goodbyeMessage || 'Default' },
            { name: 'DM Welcome', value: settings.dmWelcome ? 'On' : 'Off' },
            { name: 'Greet Bots', value: settings.greetBots ? 'On' : 'Off' },
          )
          .setFooter(footer)
          .setTimestamp()],
      });
    }
  },
};