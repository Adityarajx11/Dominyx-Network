const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { getGuardSettings, updateGuardSettings, addSelfRole, removeSelfRole } = require('../lib/guardStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guardsetup')
    .setDescription('Admin only: configure Dominyx Guard')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('modlog')
        .setDescription('Set the channel where cases get logged')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Text channel for mod-log embeds')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('selfroleadd')
        .setDescription('Add a role to a self-assignable category')
        .addRoleOption(opt => opt.setName('role').setDescription('Role to make self-assignable').setRequired(true))
        .addStringOption(opt =>
          opt.setName('category')
            .setDescription('Category name, e.g. Games, Notifications, Pronouns')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('selfroleremove')
        .setDescription('Remove a role from self-assignable roles')
        .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('show')
        .setDescription('Show current Guard configuration')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'modlog') {
      const channel = interaction.options.getChannel('channel');
      await updateGuardSettings(guildId, { modlog_channel_id: channel.id });
      return interaction.reply(`✅ Case mod-log will now post in ${channel}.`);
    }

    if (sub === 'selfroleadd') {
      const role = interaction.options.getRole('role');
      const category = interaction.options.getString('category');
      await addSelfRole(guildId, category, role.id);
      return interaction.reply(`✅ **${role.name}** added to category **${category}**.`);
    }

    if (sub === 'selfroleremove') {
      const role = interaction.options.getRole('role');
      const foundCategory = await removeSelfRole(guildId, role.id);
      if (!foundCategory) {
        return interaction.reply({ content: `❌ **${role.name}** wasn't in any self-assignable category.`, ephemeral: true });
      }
      return interaction.reply(`☑️ Removed **${role.name}** from category **${foundCategory}**.`);
    }

    if (sub === 'show') {
      const settings = await getGuardSettings(guildId);
      const categories = settings?.self_role_categories || {};
      const categorySummary = Object.entries(categories)
        .map(([name, ids]) => `**${name}**: ${ids.length} role(s)`)
        .join('\n') || 'None set up';

      const embed = new EmbedBuilder()
        .setColor(0xDC143C)
        .setTitle('🛡️ Guard Configuration')
        .setFooter({ text: 'Dominyx • Guard' })
        .setTimestamp()
        .addFields(
          { name: 'Mod-Log Channel', value: settings?.modlog_channel_id ? `<#${settings.modlog_channel_id}>` : 'Not set' },
          { name: 'Self-role Categories', value: categorySummary },
        );
      return interaction.reply({ embeds: [embed] });
    }
  },
};