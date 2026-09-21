const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');
const { getPingSettings, updatePingSettings } = require('../lib/pingStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pingsetup')
    .setDescription('Admin only: configure YouTube live alerts')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('youtube')
        .setDescription('Set up YouTube "went live" alerts')
        .addStringOption(opt =>
          opt.setName('channel_id')
            .setDescription('YouTube channel ID (starts with UC...)')
            .setRequired(true))
        .addChannelOption(opt =>
          opt.setName('alert_channel')
            .setDescription('Text channel to post live alerts in')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Turn off YouTube live alerts'))
    .addSubcommand(sub =>
      sub.setName('message')
        .setDescription('Custom alert text ({channel} {title} {url}, empty to reset)')
        .addStringOption(opt => opt.setName('text').setDescription('Alert message template')))
    .addSubcommand(sub =>
      sub.setName('mentionrole')
        .setDescription('Role pinged on every live alert (empty choice clears)')
        .addRoleOption(opt => opt.setName('role').setDescription('Mention role')))
    .addSubcommand(sub =>
      sub.setName('pollminutes')
        .setDescription('How often to check for live streams (1-60 min)')
        .addIntegerOption(opt => opt.setName('minutes').setDescription('Minutes between checks').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('show')
        .setDescription('Show current ping configuration')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'youtube') {
      const channelId = interaction.options.getString('channel_id');
      const alertChannel = interaction.options.getChannel('alert_channel');
      await updatePingSettings(guildId, {
        youtube_channel_id: channelId,
        live_alert_channel_id: alertChannel.id,
        enabled: true,
      });
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xDC143C)
          .setTitle('✅ YouTube Live Alerts Enabled')
          .setDescription(`Watching \`${channelId}\`. Live alerts will post in ${alertChannel}.`)
          .setFooter({ text: 'Dominyx • Ping' })
          .setTimestamp()],
      });
    }

    if (sub === 'disable') {
      await updatePingSettings(guildId, { enabled: false });
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xDC143C)
          .setTitle('☑️ YouTube Live Alerts Disabled')
          .setDescription('No more live notifications until you re-enable.')
          .setFooter({ text: 'Dominyx • Ping' })
          .setTimestamp()],
      });
    }

    if (sub === 'message') {
      const text = interaction.options.getString('text');
      await updatePingSettings(guildId, { alert_message: text || null });
      return interaction.reply({
        content: text ? '✅ Custom alert message set. Placeholders: `{channel}` `{title}` `{url}`.' : '☑️ Alert message reset to default.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === 'mentionrole') {
      const role = interaction.options.getRole('role');
      await updatePingSettings(guildId, { mention_role_id: role ? role.id : null });
      return interaction.reply({
        content: role ? `✅ Will ping **${role.name}** on every live alert.` : '☑️ Mention role cleared.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === 'pollminutes') {
      const minutes = interaction.options.getInteger('minutes');
      if (minutes < 1 || minutes > 60) {
        return interaction.reply({ content: '❌ Minutes must be between 1 and 60.', flags: MessageFlags.Ephemeral });
      }
      await updatePingSettings(guildId, { poll_minutes: minutes });
      return interaction.reply({ content: `✅ Checking for live streams every **${minutes} minute(s)**.`, flags: MessageFlags.Ephemeral });
    }

    if (sub === 'show') {
      const settings = await getPingSettings(guildId);
      const embed = new EmbedBuilder()
        .setColor(0xDC143C)
        .setTitle('📡 Ping Configuration')
        .setFooter({ text: 'Dominyx • Ping' })
        .setTimestamp()
        .addFields(
          { name: 'YouTube Channel ID', value: settings?.youtube_channel_id || 'Not set' },
          { name: 'Alert Channel', value: settings?.live_alert_channel_id ? `<#${settings.live_alert_channel_id}>` : 'Not set' },
          { name: 'Status', value: settings?.enabled === false ? 'Disabled' : 'Active' },
          { name: 'Custom Message', value: settings?.alert_message || 'Default' },
          { name: 'Mention Role', value: settings?.mention_role_id ? `<@&${settings.mention_role_id}>` : 'None' },
          { name: 'Check Interval', value: `${settings?.poll_minutes ?? 10} minute(s)` },
        );
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  },
};
