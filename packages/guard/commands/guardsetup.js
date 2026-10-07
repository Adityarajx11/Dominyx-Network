const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');
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
      sub.setName('raid')
        .setDescription('Anti-raid: act on join bursts')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Turn raid protection on/off').setRequired(true))
        .addIntegerOption(opt => opt.setName('joins').setDescription('Joins that trigger raid mode (default 5)').setMinValue(2).setMaxValue(20))
        .addIntegerOption(opt => opt.setName('seconds').setDescription('Inside this many seconds (default 10)').setMinValue(5).setMaxValue(120))
        .addStringOption(opt =>
          opt.setName('action')
            .setDescription('What to do with raiders (default kick)')
            .addChoices({ name: 'Kick', value: 'kick' }, { name: 'Timeout 10 min', value: 'timeout' }))
        .addIntegerOption(opt => opt.setName('cooldown').setDescription('Raid mode minutes (default 10)').setMinValue(1).setMaxValue(120)))
    .addSubcommand(sub =>
      sub.setName('agegate')
        .setDescription('Block accounts younger than X days')
        .addIntegerOption(opt => opt.setName('days').setDescription('Minimum account age in days (0 = off)').setMinValue(0).setMaxValue(365).setRequired(true))
        .addStringOption(opt =>
          opt.setName('action')
            .setDescription('What to do with new accounts (default kick)')
            .addChoices({ name: 'Kick', value: 'kick' }, { name: 'Timeout 10 min', value: 'timeout' })))
    .addSubcommand(sub =>
      sub.setName('filter')
        .setDescription('Toggle mention / emoji / word / scam filters')
        .addIntegerOption(opt => opt.setName('mentions').setDescription('Max mentions per message (0 = off)').setMinValue(0).setMaxValue(20))
        .addIntegerOption(opt => opt.setName('emojis').setDescription('Max emojis per message (0 = off)').setMinValue(0).setMaxValue(50))
        .addBooleanOption(opt => opt.setName('scam').setDescription('Delete suspected scam/phishing links'))
        .addStringOption(opt => opt.setName('addword').setDescription('Add a banned word'))
        .addStringOption(opt => opt.setName('removeword').setDescription('Remove a banned word'))
        .addBooleanOption(opt => opt.setName('showwords').setDescription('List banned words')))
    .addSubcommand(sub =>
      sub.setName('nuke')
        .setDescription('Anti-nuke: rollback + nuker punishment')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Turn anti-nuke alerts on/off').setRequired(true))
        .addStringOption(opt =>
          opt.setName('action')
            .setDescription('What to do with the nuker (default: just alert)')
            .addChoices({ name: 'Alert only', value: 'alert' }, { name: 'Timeout 1 hour', value: 'timeout' }, { name: 'Ban', value: 'ban' }))
        .addBooleanOption(opt => opt.setName('rollback').setDescription('Re-create deleted channels/roles on nuke (default on)')))
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
      if (category.length > 40) {
        return interaction.reply({ content: '❌ Category name must be 40 characters or less (button limit).', flags: MessageFlags.Ephemeral });
      }
      await addSelfRole(guildId, category, role.id);
      return interaction.reply(`✅ **${role.name}** added to category **${category}**.`);
    }

    if (sub === 'selfroleremove') {
      const role = interaction.options.getRole('role');
      const foundCategory = await removeSelfRole(guildId, role.id);
      if (!foundCategory) {
        return interaction.reply({ content: `❌ **${role.name}** wasn't in any self-assignable category.`, flags: MessageFlags.Ephemeral });
      }
      return interaction.reply(`☑️ Removed **${role.name}** from category **${foundCategory}**.`);
    }

    if (sub === 'raid') {
      const patch = { raid_enabled: interaction.options.getBoolean('enabled') };
      const joins = interaction.options.getInteger('joins');
      const seconds = interaction.options.getInteger('seconds');
      const action = interaction.options.getString('action');
      const cooldown = interaction.options.getInteger('cooldown');
      if (joins !== null) patch.raid_joins = joins;
      if (seconds !== null) patch.raid_seconds = seconds;
      if (action) patch.raid_action = action;
      if (cooldown !== null) patch.raid_cooldown_minutes = cooldown;
      await updateGuardSettings(guildId, patch);
      const updated = await getGuardSettings(guildId).catch(() => null);
      return interaction.reply(`✅ Raid protection **${updated?.raid_enabled ? 'ON' : 'OFF'}** — ${updated?.raid_joins ?? 5} joins / ${updated?.raid_seconds ?? 10}s → ${updated?.raid_action ?? 'kick'}.`);
    }

    if (sub === 'agegate') {
      const days = interaction.options.getInteger('days');
      const action = interaction.options.getString('action');
      const patch = { min_account_age_days: days };
      if (action) patch.age_action = action;
      await updateGuardSettings(guildId, patch);
      const ageNow = await getGuardSettings(guildId).catch(() => null);
      return interaction.reply(days > 0
        ? `✅ Accounts younger than **${days} day(s)** get **${ageNow?.age_action ?? 'kick'}ed** on join.`
        : '☑️ Age gate **off** — all account ages can join.');
    }

    if (sub === 'filter') {
      const mentions = interaction.options.getInteger('mentions');
      const emojis = interaction.options.getInteger('emojis');
      const scam = interaction.options.getBoolean('scam');
      const addWord = interaction.options.getString('addword');
      const removeWord = interaction.options.getString('removeword');
      const showWords = interaction.options.getBoolean('showwords');
      const patch = {};
      if (mentions !== null) {
        patch.automod_mentions = mentions > 0;
        patch.mention_threshold = mentions > 0 ? mentions : 5;
      }
      if (emojis !== null) {
        patch.automod_emoji = emojis > 0;
        patch.emoji_threshold = emojis > 0 ? emojis : 10;
      }
      if (scam !== null) patch.scam_links = scam;
      const current = await getGuardSettings(guildId).catch(() => null);
      let words = Array.isArray(current?.bad_words) ? [...current.bad_words] : [];
      if (addWord) {
        if (!words.map((w) => String(w).toLowerCase()).includes(addWord.toLowerCase())) words.push(addWord.toLowerCase());
        patch.automod_words = true;
        patch.bad_words = words;
      }
      if (removeWord) {
        words = words.filter((w) => String(w).toLowerCase() !== removeWord.toLowerCase());
        patch.bad_words = words;
      }
      if (Object.keys(patch).length > 0) await updateGuardSettings(guildId, patch);
      if (showWords) {
        const list = (patch.bad_words ?? words).join(', ') || 'none';
        return interaction.reply(`📝 Banned words: ${list}`);
      }
      return interaction.reply('✅ Filters updated.');
    }

    if (sub === 'nuke') {
      const patch = { antinuke_enabled: interaction.options.getBoolean('enabled') };
      const action = interaction.options.getString('action');
      const rollback = interaction.options.getBoolean('rollback');
      if (action) patch.nuke_action = action;
      if (rollback !== null) patch.nuke_rollback = rollback;
      await updateGuardSettings(guildId, patch);
      const updated = await getGuardSettings(guildId).catch(() => null);
      return interaction.reply(`✅ Anti-nuke **${updated?.antinuke_enabled !== false ? 'ON' : 'OFF'}** — nuker gets **${updated?.nuke_action ?? 'alert'}**, rollback **${updated?.nuke_rollback !== false ? 'on' : 'off'}**.`);
    }

    if (sub === 'show') {
      const settings = await getGuardSettings(guildId);
      const categories = settings?.self_role_categories || {};
      const categorySummary = Object.entries(categories)
        .map(([name, ids]) => `**${name}**: ${Array.isArray(ids) ? ids.length : 0} role(s)`)
        .join('\n') || 'None set up';
      const words = Array.isArray(settings?.bad_words) ? settings.bad_words.join(', ') : '';
      const locked = Array.isArray(settings?.locked_channels) ? settings.locked_channels.length : 0;

      const embed = new EmbedBuilder()
        .setColor(0xDC143C)
        .setTitle('🛡️ Guard Configuration')
        .setFooter({ text: 'Dominyx • Guard' })
        .setTimestamp()
        .addFields(
          { name: 'Mod-Log Channel', value: settings?.modlog_channel_id ? `<#${settings.modlog_channel_id}>` : 'Not set' },
          { name: 'Self-role Categories', value: categorySummary },
          {
            name: 'Raid Protection',
            value: settings?.raid_enabled
              ? `ON — ${settings.raid_joins ?? 5} joins/${settings.raid_seconds ?? 10}s → ${settings.raid_action ?? 'kick'} (${settings.raid_cooldown_minutes ?? 10}m)`
              : 'Off',
          },
          {
            name: 'Age Gate',
            value: (settings?.min_account_age_days ?? 0) > 0
              ? `Min ${settings.min_account_age_days}d → ${settings.age_action ?? 'kick'}`
              : 'Off',
          },
          {
            name: 'Filters',
            value: [
              `Mentions: ${settings?.automod_mentions ? `max ${settings.mention_threshold ?? 5}` : 'off'}`,
              `Emojis: ${settings?.automod_emoji ? `max ${settings.emoji_threshold ?? 10}` : 'off'}`,
              `Words: ${settings?.automod_words ? (words || 'list empty') : 'off'}`,
              `Scam links: ${settings?.scam_links ? 'on' : 'off'}`,
              `Locked channels: ${locked}`,
            ].join('\n'),
          },
          {
            name: 'Anti-nuke',
            value: settings?.antinuke_enabled === false
              ? 'Off'
              : `On — nuker gets ${settings?.nuke_action ?? 'alert'}, rollback ${settings?.nuke_rollback !== false ? 'on' : 'off'}`,
          },
        );
      return interaction.reply({ embeds: [embed] });
    }
  },
};
