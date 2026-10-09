const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { setTier, removeTier, getTiers, resetSeason } = require('../lib/musicXp');
const { pool } = require('@dominyx/core');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xpsetup')
    .setDescription('Admin only: music XP tiers and season')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('tier')
        .setDescription('Role auto-given at an XP threshold')
        .addIntegerOption(opt => opt.setName('xp').setDescription('Season XP needed').setRequired(true).setMinValue(1))
        .addRoleOption(opt => opt.setName('role').setDescription('Reward role').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('removetier')
        .setDescription('Remove a reward tier')
        .addIntegerOption(opt => opt.setName('xp').setDescription('Threshold to remove').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('togglexp')
        .setDescription('Turn music XP on/off')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('XP on?').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('resetseason')
        .setDescription('Zero all season XP (lifetime kept)'))
    .addSubcommand(sub =>
      sub.setName('show')
        .setDescription('Show tiers and season')),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Server-only command.', flags: MessageFlags.Ephemeral });
    }
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'tier') {
      const xp = interaction.options.getInteger('xp');
      const role = interaction.options.getRole('role');
      if (role.managed) {
        return interaction.reply({ content: '❌ Bot/integration roles cannot be reward roles.', flags: MessageFlags.Ephemeral });
      }
      await setTier(guildId, xp, role.id);
      return interaction.reply(`✅ **${role.name}** at **${xp}** season XP. Keep my role above it or I can't assign it.`);
    }

    if (sub === 'removetier') {
      const xp = interaction.options.getInteger('xp');
      await removeTier(guildId, xp);
      return interaction.reply(`☑️ Removed the **${xp} XP** tier.`);
    }

    if (sub === 'togglexp') {
      const enabled = interaction.options.getBoolean('enabled');
      await pool.query(
        `INSERT INTO music_settings (guild_id, xp_enabled, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (guild_id) DO UPDATE SET xp_enabled = $2, updated_at = NOW()`,
        [guildId, enabled]
      );
      return interaction.reply(enabled ? '✅ Music XP **on**.' : '☑️ Music XP **off** (stats still record).');
    }

    if (sub === 'resetseason') {
      await resetSeason(guildId);
      return interaction.reply('🔄 Season XP zeroed. Lifetime XP untouched.');
    }

    const tiers = await getTiers(guildId).catch(() => []);
    const text = tiers.map((t) => `**${t.threshold}** XP → <@&${t.role_id}>`).join('\n') || 'No tiers yet.';
    return interaction.reply({ content: `🏆 **Music XP tiers**\n${text}`, flags: MessageFlags.Ephemeral });
  },
};
