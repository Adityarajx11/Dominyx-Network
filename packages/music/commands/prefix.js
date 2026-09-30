const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getMusicSettings, setPrefix } = require('../lib/settings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Show or change the prefix for !p-style music commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('set')
        .setDescription('New prefix: 1-3 characters, e.g. ! or ? or $')
        .setMinLength(1)
        .setMaxLength(3)),

  async execute(interaction) {
    const next = interaction.options.getString('set');
    if (!next) {
      const settings = await getMusicSettings(interaction.guild.id);
      return interaction.reply(`🔧 Prefix is **${settings.prefix}**. Change it: \`/prefix set:?\``);
    }
    if (/\s/.test(next)) {
      return interaction.reply('❌ Prefix cannot contain spaces.');
    }
    await setPrefix(interaction.guild.id, next);
    return interaction.reply(`✅ Prefix → **${next}**. Try \`${next}p <song>\`.`);
  },
};
