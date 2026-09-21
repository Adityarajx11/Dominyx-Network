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
        );
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  },
};
