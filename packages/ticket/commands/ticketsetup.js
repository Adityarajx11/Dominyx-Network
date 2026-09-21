const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');
const { getConfig, setConfig } = require('../lib/ticketStore');

const FOOTER = { text: 'Dominyx • Tickets', iconURL: null };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketsetup')
    .setDescription('Admin only: configure the ticket system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('category')
        .setDescription('Set the category where ticket channels are created')
        .addChannelOption(opt => opt.setName('category').setDescription('Category channel').addChannelTypes(ChannelType.GuildCategory).setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('logchannel')
        .setDescription('Set the ticket log channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Log channel').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('staffrole')
        .setDescription('Set the staff role for ticket claims')
        .addRoleOption(opt => opt.setName('role').setDescription('Staff role').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('maxtickets')
        .setDescription('Set the maximum open tickets per user')
        .addIntegerOption(opt => opt.setName('number').setDescription('Max tickets per user').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('addcategory')
        .setDescription('Add a ticket category option')
        .addStringOption(opt => opt.setName('label').setDescription('Category label').setRequired(true))
        .addStringOption(opt => opt.setName('emoji').setDescription('Optional emoji'))
        .addStringOption(opt => opt.setName('description').setDescription('Optional category description')))
    .addSubcommand(sub =>
      sub.setName('removecategory')
        .setDescription('Remove a ticket category option')
        .addStringOption(opt => opt.setName('label').setDescription('Category label to remove').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('resetcategories')
        .setDescription('Clear all ticket category options'))
    .addSubcommand(sub =>
      sub.setName('addbanner')
        .setDescription('Set the banner image for the ticket panel')
        .addStringOption(opt => opt.setName('url').setDescription('Image URL').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('removebanner')
        .setDescription('Remove the ticket panel banner image'))
    .addSubcommand(sub =>
      sub.setName('inactivehours')
        .setDescription('Auto-close tickets idle this long (0 = off)')
        .addIntegerOption(opt => opt.setName('hours').setDescription('Hours of inactivity (0-720)').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('dmclose')
        .setDescription('DM the creator a notice when their ticket closes')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('On or off').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('paneltitle')
        .setDescription('Custom title for the ticket panel embed')
        .addStringOption(opt => opt.setName('title').setDescription('Panel title (empty to reset)')))
    .addSubcommand(sub =>
      sub.setName('panelrules')
        .setDescription('Custom rules text for the ticket panel embed')
        .addStringOption(opt => opt.setName('rules').setDescription('Rules text (empty to reset)')))
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View current ticket configuration')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    const reply = (msg) => interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });

    if (sub === 'category') {
      const category = interaction.options.getChannel('category');
      await setConfig(guildId, { category_channel_id: category.id });
      return reply(`✅ Ticket category set to ${category}.`);
    }

    if (sub === 'logchannel') {
      const channel = interaction.options.getChannel('channel');
      await setConfig(guildId, { log_channel_id: channel.id });
      return reply(`✅ Ticket log channel set to ${channel}.`);
    }

    if (sub === 'staffrole') {
      const role = interaction.options.getRole('role');
      await setConfig(guildId, { staff_role_id: role.id });
      return reply(`✅ Ticket staff role set to **${role.name}**.`);
    }

    if (sub === 'maxtickets') {
      const num = interaction.options.getInteger('number');
      await setConfig(guildId, { max_tickets_per_user: num });
      return reply(`✅ Max tickets per user set to **${num}**.`);
    }

    if (sub === 'addcategory') {
      const label = interaction.options.getString('label');
      const emoji = interaction.options.getString('emoji') || null;
      const description = interaction.options.getString('description') || null;
      const cfg = await getConfig(guildId) || { categories: [] };
      const categories = cfg.categories || [];
      categories.push({ label, emoji, description });
      await setConfig(guildId, { categories });
      return reply(`✅ Added category **${label}**.`);
    }

    if (sub === 'removecategory') {
      const label = interaction.options.getString('label');
      const cfg = await getConfig(guildId) || { categories: [] };
      const categories = (cfg.categories || []).filter(c => c.label !== label);
      await setConfig(guildId, { categories });
      return reply(`☑️ Removed category **${label}**.`);
    }

    if (sub === 'resetcategories') {
      await setConfig(guildId, { categories: [] });
      return reply('🗑️ All ticket categories cleared. Use /ticketsetup addcategory to add fresh ones.');
    }

    if (sub === 'addbanner') {
      const url = interaction.options.getString('url');
      if (!/^https?:\/\/.+/i.test(url)) {
        return reply('❌ That doesn\'t look like an image URL. It must start with http:// or https://.');
      }
      await setConfig(guildId, { banner_url: url });
      return reply('✅ Banner image set.');
    }

    if (sub === 'removebanner') {
      await setConfig(guildId, { banner_url: null });
      return reply('☑️ Banner image removed.');
    }

    if (sub === 'inactivehours') {
      const hours = interaction.options.getInteger('hours');
      if (hours < 0 || hours > 720) return reply('❌ Hours must be between 0 and 720 (0 = off).');
      await setConfig(guildId, { inactive_close_hours: hours });
      return reply(hours === 0 ? '☑️ Inactivity auto-close **disabled**.' : `✅ Tickets idle for **${hours}h** will auto-close.`);
    }

    if (sub === 'dmclose') {
      const enabled = interaction.options.getBoolean('enabled');
      await setConfig(guildId, { dm_close: enabled });
      return reply(enabled ? '✅ Creators will be DM\u2019d when their ticket closes.' : '☑️ Close DMs **disabled**.');
    }

    if (sub === 'paneltitle') {
      const title = interaction.options.getString('title');
      await setConfig(guildId, { panel_title: title || null });
      return reply(title ? '✅ Panel title set.' : '☑️ Panel title reset to default.');
    }

    if (sub === 'panelrules') {
      const rules = interaction.options.getString('rules');
      await setConfig(guildId, { panel_rules: rules || null });
      return reply(rules ? '✅ Panel rules set.' : '☑️ Panel rules reset to default.');
    }

    if (sub === 'view') {
      const cfg = await getConfig(guildId) || {};
      const embed = new EmbedBuilder()
        .setColor(0xDC143C)
        .setTitle('🎫 Ticket Configuration')
        .setFooter(FOOTER)
        .setTimestamp()
        .addFields(
          { name: 'Category Channel', value: cfg.category_channel_id ? `<#${cfg.category_channel_id}>` : 'Not set', inline: true },
          { name: 'Log Channel', value: cfg.log_channel_id ? `<#${cfg.log_channel_id}>` : 'Not set', inline: true },
          { name: 'Staff Role', value: cfg.staff_role_id ? `<@&${cfg.staff_role_id}>` : 'Not set', inline: true },
          { name: 'Max Tickets Per User', value: String(cfg.max_tickets_per_user || 1), inline: true },
          { name: 'Banner URL', value: cfg.banner_url ? `[View](${cfg.banner_url})` : 'Not set', inline: true },
          { name: 'Auto-close After', value: cfg.inactive_close_hours ? `${cfg.inactive_close_hours}h idle` : 'Off', inline: true },
          { name: 'DM On Close', value: cfg.dm_close ? 'On' : 'Off', inline: true },
          { name: 'Panel Title', value: cfg.panel_title || 'Default', inline: true },
          { name: 'Categories', value: (cfg.categories || []).map(c => `${c.emoji ? c.emoji + ' ' : ''}${c.label}`).join('\n') || 'None configured' },
        );
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  },
};
