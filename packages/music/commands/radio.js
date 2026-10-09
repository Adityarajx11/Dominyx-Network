const {
  SlashCommandBuilder, EmbedBuilder, MessageFlags,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const { startRadio, stopRadio, getRadio, refillRadio, favCurrent } = require('../lib/radio');
const { getOrCreatePlayer, getManager } = require('../lib/lavalink');
const { getMusicSettings, requireDj } = require('../lib/settings');
const { similarArtists } = require('../lib/reco');
const { pool } = require('@dominyx/core');

function sessionEmbed(session) {
  return new EmbedBuilder()
    .setColor(0xEC4899)
    .setTitle(`📻 Radio: ${session.seed_artist}`)
    .setDescription(`Mode: **${session.mode === 'only' ? 'Artist Only' : 'Artist Mix'}** — auto-refills when the queue runs low.`)
    .setFooter({ text: 'Dominyx • Radio' });
}

function sessionRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('radio_pause').setLabel('⏸️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('radio_next').setLabel('⏭️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('radio_fav').setLabel('⭐ Favourite').setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('radio_refresh').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('radio_stop').setLabel('⏹️ Stop radio').setStyle(ButtonStyle.Danger),
    ),
  ];
}

async function autocompleteArtists(focused) {
  const out = [];
  try {
    const res = await pool.query(
      `SELECT artist, COUNT(*) c FROM play_history WHERE artist ILIKE $1 GROUP BY artist ORDER BY c DESC LIMIT 5`,
      [`%${focused}%`]
    );
    for (const r of res.rows) out.push({ name: `🕘 ${r.artist}`, value: r.artist.slice(0, 100) });
  } catch {}
  if (focused && out.length < 5) {
    try {
      const sims = await similarArtists(focused, 5 - out.length);
      for (const a of sims) {
        if (!out.some((o) => o.value.toLowerCase() === a.toLowerCase())) out.push({ name: a.slice(0, 100), value: a.slice(0, 100) });
      }
    } catch {}
  }
  return out.slice(0, 25);
}

async function handleRadioButton(interaction) {
  const id = interaction.customId;
  const guildId = interaction.guild.id;
  if (id !== 'radio_fav') {
    const { requireDj: dj } = require('../lib/settings');
    if (!(await dj(interaction))) return;
  }
  let player;
  try {
    player = getManager()?.getPlayer(guildId);
  } catch {
    player = null;
  }
  if (id === 'radio_fav') {
    const fav = await favCurrent(interaction.user.id, guildId).catch(() => null);
    return interaction.reply({
      content: fav ? `⭐ Saved **${fav.title}** to your favourites.` : '❌ Nothing playing.',
      flags: MessageFlags.Ephemeral,
    });
  }
  if (!player) return interaction.reply({ content: '🚫 Radio is off.', flags: MessageFlags.Ephemeral });
  if (id === 'radio_pause') {
    if (player.paused) await player.resume().catch(() => {});
    else await player.pause().catch(() => {});
    return interaction.reply({ content: player.paused ? '⏸️ Paused.' : '▶️ Resumed.', flags: MessageFlags.Ephemeral });
  }
  if (id === 'radio_next') {
    await player.skip(0, false).catch(() => {});
    return interaction.reply({ content: '⏭️ Skipped.', flags: MessageFlags.Ephemeral });
  }
  if (id === 'radio_refresh') {
    const n = await refillRadio(interaction.client, guildId, interaction.user.tag).catch(() => 0);
    return interaction.reply({ content: n > 0 ? `🔄 Added **${n}** fresh track(s).` : '✅ Queue already full.', flags: MessageFlags.Ephemeral });
  }
  if (id === 'radio_stop') {
    const { stopRadio: stop } = require('../lib/radio');
    await stop(guildId).catch(() => {});
    return interaction.reply({ content: '⏹️ Radio stopped (queue keeps playing out).', flags: MessageFlags.Ephemeral });
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('radio')
    .setDescription('Artist radio that never runs dry')
    .addStringOption(opt =>
      opt.setName('artist').setDescription('Seed artist').setRequired(true).setAutocomplete(true))
    .addStringOption(opt =>
      opt.setName('mode').setDescription('Only this artist, or a mix of related ones')
        .addChoices({ name: 'Artist Only', value: 'only' }, { name: 'Artist Mix', value: 'mix' })),

  async execute(interaction, client) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Server-only command.', flags: MessageFlags.Ephemeral });
    }
    if (!(await requireDj(interaction))) return;
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: '🚫 Join a voice channel first.', flags: MessageFlags.Ephemeral });
    }
    const artist = interaction.options.getString('artist');
    const mode = interaction.options.getString('mode') || 'mix';
    await interaction.deferReply();

    const settings = await getMusicSettings(interaction.guild.id).catch(() => ({}));
    let player;
    try {
      player = getOrCreatePlayer(
        { member: interaction.member, guild: interaction.guild, channel: interaction.channel },
        { volume: settings.defaultVolume }
      );
      if (!player.connected) await player.connect();
    } catch {
      return interaction.editReply('🔌 Could not join voice.');
    }
    await startRadio(interaction.guild.id, artist, mode);
    const added = await refillRadio(client, interaction.guild.id, interaction.user.tag).catch(() => 0);
    const session = await getRadio(interaction.guild.id);
    await interaction.editReply({
      content: added > 0 ? `📻 Radio on — **${added}** track(s) queued.` : '📻 Radio on — filling the queue…',
      embeds: [sessionEmbed(session || { seed_artist: artist, mode })],
      components: sessionRows(),
    });
  },

  autocompleteArtists,
  handleRadioButton,
  sessionEmbed,
  sessionRows,
};
