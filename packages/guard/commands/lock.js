const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { getGuardSettings, updateGuardSettings } = require('../lib/guardStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel (or the current one) so @everyone cannot send messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Channel to lock (default: current)')
        .addChannelTypes(ChannelType.GuildText))
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason shown in the channel')),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason') || 'Locked by staff';
    if (!channel?.isTextBased?.()) {
      return interaction.reply({ content: '❌ That is not a text channel.', flags: MessageFlags.Ephemeral });
    }

    const everyone = interaction.guild.roles.everyone;
    try {
      await channel.permissionOverwrites.edit(everyone, { SendMessages: false }, { reason: `Guard /lock by ${interaction.user.tag}: ${reason}` });
    } catch {
      return interaction.reply({ content: '❌ I cannot lock that channel (check my role position and Manage Channels permission).', flags: MessageFlags.Ephemeral });
    }

    try {
      const settings = await getGuardSettings(interaction.guild.id).catch(() => null);
      const locked = Array.isArray(settings?.locked_channels) ? settings.locked_channels : [];
      if (!locked.includes(channel.id)) {
        await updateGuardSettings(interaction.guild.id, { locked_channels: [...locked, channel.id] });
      }
    } catch {}

    await channel.send(`🔒 **Channel locked** — ${reason}`).catch(() => {});
    return interaction.reply(`🔒 Locked ${channel}. Use \`/unlock\` to reopen it.`);
  },
};
