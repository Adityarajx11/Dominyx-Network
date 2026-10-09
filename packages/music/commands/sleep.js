const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { setTimer, getTimer, clearTimer, remainingText } = require('../lib/sleepTimer');
const { requireDj } = require('../lib/settings');

const PRESETS = { '10m': 10, '30m': 30, '1h': 60, '2h': 120 };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sleep')
    .setDescription('Sleep timer: stop music later')
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Arm the sleep timer')
        .addStringOption(opt =>
          opt.setName('mode')
            .setDescription('When to stop')
            .setRequired(true)
            .addChoices(
              { name: 'After time', value: 'duration' },
              { name: 'After this song', value: 'song' },
              { name: 'When queue ends', value: 'queue' },
              { name: 'After N songs', value: 'count' }))
        .addIntegerOption(opt =>
          opt.setName('value')
            .setDescription('Minutes (time) or songs (count). Presets: use 10/30/60/120')
            .setMinValue(1).setMaxValue(2880))
        .addStringOption(opt =>
          opt.setName('action')
            .setDescription('Stop only, or stop + leave voice')
            .addChoices({ name: 'Stop', value: 'stop' }, { name: 'Stop + leave', value: 'leave' })))
    .addSubcommand(sub => sub.setName('cancel').setDescription('Cancel the sleep timer'))
    .addSubcommand(sub => sub.setName('show').setDescription('Show the sleep timer')),

  async execute(interaction, client) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Server-only command.', flags: MessageFlags.Ephemeral });
    }
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'cancel') {
      if (!(await requireDj(interaction))) return;
      await clearTimer(guildId);
      return interaction.reply('☑️ Sleep timer cancelled.');
    }

    if (sub === 'show') {
      const timer = await getTimer(guildId).catch(() => null);
      if (!timer) return interaction.reply({ content: '😴 No sleep timer set.', flags: MessageFlags.Ephemeral });
      return interaction.reply({ content: `😴 Sleep timer: **${timer.mode}** — ${remainingText(timer)} (action: ${timer.end_action}).`, flags: MessageFlags.Ephemeral });
    }

    if (!(await requireDj(interaction))) return;
    const mode = interaction.options.getString('mode');
    const value = interaction.options.getInteger('value');
    const action = interaction.options.getString('action') || 'stop';

    if (mode === 'duration') {
      const mins = value || 30;
      await setTimer(guildId, {
        mode, expiresAt: new Date(Date.now() + mins * 60000),
        endAction: action, channelId: interaction.channel.id, createdBy: interaction.user.id,
      });
      return interaction.reply(`😴 Sleep in **${mins} min** → ${action === 'leave' ? 'stop + leave' : 'stop'}. \`/sleep cancel\` to abort.`);
    }
    if (mode === 'count') {
      const n = Math.min(20, Math.max(1, value || 5));
      await setTimer(guildId, {
        mode, songsLeft: n, endAction: action,
        channelId: interaction.channel.id, createdBy: interaction.user.id,
      });
      return interaction.reply(`😴 Sleep after **${n}** song(s) → ${action === 'leave' ? 'stop + leave' : 'stop'}.`);
    }
    await setTimer(guildId, {
      mode, endAction: action, channelId: interaction.channel.id, createdBy: interaction.user.id,
    });
    return interaction.reply(mode === 'song'
      ? `😴 Sleep after **this song** → ${action === 'leave' ? 'stop + leave' : 'stop'}.`
      : `😴 Sleep when the **queue ends** → ${action === 'leave' ? 'stop + leave' : 'stop'}.`);
  },
};

module.exports.PRESETS = PRESETS;
