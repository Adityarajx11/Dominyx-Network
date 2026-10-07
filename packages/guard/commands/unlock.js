const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { getGuardSettings, updateGuardSettings } = require('../lib/guardStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a channel locked with /lock')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Channel to unlock (default: current)')
        .addChannelTypes(ChannelType.GuildText)),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Server-only command.', flags: MessageFlags.Ephemeral });
    }
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    if (channel?.isThread?.() || channel?.type !== ChannelType.GuildText || typeof channel?.permissionOverwrites?.edit !== 'function') {
      return interaction.reply({ content: '❌ Pick a normal text channel (not a thread).', flags: MessageFlags.Ephemeral });
    }

    const everyone = interaction.guild.roles.everyone;
    try {
      await channel.permissionOverwrites.edit(everyone, { SendMessages: null }, { reason: `Guard /unlock by ${interaction.user.tag}` });
    } catch {
      return interaction.reply({ content: '❌ I cannot unlock that channel (check my role position and Manage Channels permission).', flags: MessageFlags.Ephemeral });
    }

    try {
      const settings = await getGuardSettings(interaction.guild.id).catch(() => null);
      const locked = Array.isArray(settings?.locked_channels) ? settings.locked_channels : [];
      await updateGuardSettings(interaction.guild.id, { locked_channels: locked.filter((id) => id !== channel.id) });
    } catch {}

    await channel.send('🔓 **Channel unlocked** — talk away.').catch(() => {});
    return interaction.reply(`🔓 Unlocked ${channel}.`);
  },
};
