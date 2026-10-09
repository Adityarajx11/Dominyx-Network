const { EmbedBuilder, MessageFlags, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { similarTracks, youtubeRelated, youtubeIdFromUrl } = require('./reco');
const { searchTrack, getManager, getOrCreatePlayer } = require('./lavalink');
const { getMusicSettings } = require('./settings');

// messageId -> { items: [{title, url}], nextMode: bool }
const menus = new Map();

function rememberMenu(messageId, items) {
  menus.set(messageId, { items, nextMode: false });
  if (menus.size > 200) menus.delete(menus.keys().next().value);
}

// A result counts as a SONG (not a mix/jukebox/livestream) when it has a
// normal song length.
function isSongTrack(track) {
  const d = track?.info?.duration || 0;
  if (!d || d <= 0) return true; // unknown/live — let it through, player handles it
  return d >= 45000 && d <= 1200000;
}

async function buildSuggestMessage(seedTitle, seedArtist, requestTag) {
  const queries = await similarTracks(seedTitle, seedArtist, 7);
  return buildMenuFromQueries(queries, seedTitle, seedArtist, requestTag);
}

// Track-first menu: YouTube's own related videos (Dhun/Barbaad-style siblings),
// falling back to the artist's popular songs when unavailable.
async function buildRelatedSuggest(track, requestTag) {
  const title = track?.info?.title || 'Unknown';
  const artist = track?.info?.author || '';
  const vid = youtubeIdFromUrl(track?.info?.uri || '');
  if (vid) {
    const related = await youtubeRelated(vid, 5);
    if (related && related.length > 0) {
      const embed = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle('💡 You may also like')
        .setDescription(`Because you played **${title}** — ${artist}`)
        .setFooter({ text: 'Dominyx • Suggestions' });
      const menu = new StringSelectMenuBuilder()
        .setCustomId('suggest_pick')
        .setPlaceholder('Pick a song to queue…')
        .addOptions(related.map((item, i) => ({
          label: `${item.title}`.slice(0, 100),
          value: String(i),
          description: `${item.artist}`.slice(0, 100) || 'Add to queue',
        })));
      const toggle = new ButtonBuilder()
        .setCustomId('suggest_mode')
        .setLabel('Mode: Add to queue')
        .setStyle(ButtonStyle.Secondary);
      return {
        embeds: [embed],
        components: [
          new ActionRowBuilder().addComponents(menu),
          new ActionRowBuilder().addComponents(toggle),
        ],
        items: related,
      };
    }
  }
  return buildArtistSuggest(artist || title, requestTag);
}

// Artist-first menu: the artist's own popular songs, resolved to real titles.
// Result titles that scream compilation/mix, not a song.
const MIX_TITLE_RE = /\bmix\b|jukebox|compilation|\btop\s?\d+\b|playlist|nonstop|mashup|\b1\s?hour\b|\bbest of\b|collection|hour loop|lofi beats to|radio 📚/i;

async function buildArtistSuggest(artist, requestTag) {
  const a = String(artist || '').trim() || 'Unknown';
  const queries = [
    `${a} official video`,
    `${a} official music video`,
    `${a} lyrical video`,
    `${a} unplugged`,
    `${a} cover song`,
    `${a} live performance`,
    `${a} romantic song`,
  ];
  return buildMenuFromQueries(queries, a, a, requestTag);
}

async function buildMenuFromQueries(queries, seedTitle, seedArtist, requestTag) {
  const items = [];
  const resolvePass = async (maxMs) => {
    for (const q of queries) {
      if (items.length >= 5) break;
      let result;
      try {
        result = await searchTrack(q, requestTag || 'suggest', null);
      } catch {
        continue;
      }
      const t = result?.track;
      const id = t?.info?.identifier || t?.info?.uri;
      if (!t || !id || items.some((i) => i.id === id)) continue;
      if (MIX_TITLE_RE.test(t.info?.title || '')) continue;
      const d = t.info?.duration || 0;
      if (d > 0 && (d < 45000 || d > maxMs)) continue;
      items.push({ id, title: t.info.title, artist: t.info.author || '', url: t.info.uri });
    }
  };
  // Resolve now so the menu shows real song titles (never mix queries).
  await resolvePass(1200000);
  // Fallback: compilations run long — accept up to an hour before giving up.
  if (items.length < 3) await resolvePass(3600000);
  const options = items.map((item, i) => ({
    label: `${item.title}`.slice(0, 100),
    value: String(i),
    description: `${item.artist}`.slice(0, 100) || 'Add to queue',
  }));
  const menu = new StringSelectMenuBuilder()
    .setCustomId('suggest_pick')
    .setPlaceholder(items.length > 0 ? 'Pick a song to queue…' : 'No suggestions found')
    .addOptions(options.length > 0 ? options : [{ label: 'Nothing found — try /suggest with a seed', value: '0' }]);
  const toggle = new ButtonBuilder()
    .setCustomId('suggest_mode')
    .setLabel('Mode: Add to queue')
    .setStyle(ButtonStyle.Secondary);
  const embed = new EmbedBuilder()
    .setColor(0x8B5CF6)
    .setTitle('💡 You may also like')
    .setDescription(`Because you played **${seedTitle}** — ${seedArtist}`)
    .setFooter({ text: 'Dominyx • Suggestions' });
  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(menu),
      new ActionRowBuilder().addComponents(toggle),
    ],
    items,
  };
}

async function handleSuggestMenu(interaction) {
  const state = menus.get(interaction.message.id);
  if (!state) {
    return interaction.reply({ content: '❌ This menu expired — run `/suggest` again.', flags: MessageFlags.Ephemeral });
  }
  const idx = Number(interaction.values[0]);
  const item = state.items[idx];
  if (!item) {
    return interaction.reply({ content: '❌ Bad pick.', flags: MessageFlags.Ephemeral });
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  let result;
  try {
    result = await searchTrack(item.url || item.title, interaction.user.tag, interaction.user.id);
  } catch {
    return interaction.editReply('🔌 Music server is unreachable — try again in a bit.');
  }
  if (!result) return interaction.editReply('❌ Couldn\u2019t find that song.');
  const settings = await getMusicSettings(interaction.guild.id).catch(() => ({}));
  let player;
  try {
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) return interaction.editReply('🚫 Join a voice channel first.');
    player = getOrCreatePlayer(interaction, { volume: settings.defaultVolume });
    if (!player.connected) await player.connect();
  } catch {
    return interaction.editReply('🔌 Could not join voice.');
  }
  const track = result.track;
  if (state.nextMode && (player.playing || player.paused)) {
    player.queue.tracks.unshift(track);
    return interaction.editReply(`⏭️ Up next: **${track.info.title}**.`);
  }
  if (player.queue.tracks.length >= (settings.maxQueue ?? 50)) {
    return interaction.editReply('🚫 Queue is full.');
  }
  const { clearStaleCurrent } = require('./lavalink');
  clearStaleCurrent(player);
  player.queue.add(track);
  if (!player.playing && !player.paused) {
    try {
      await player.play();
    } catch (err) {
      return interaction.editReply(`❌ Couldn't start: ${err.message || err}`);
    }
    return interaction.editReply(`🎶 Playing **${track.info.title}**.`);
  }
  return interaction.editReply(`➕ Queued **${track.info.title}**.`);
}

async function handleSuggestMode(interaction) {
  const state = menus.get(interaction.message.id);
  if (!state) {
    return interaction.reply({ content: '❌ This menu expired.', flags: MessageFlags.Ephemeral });
  }
  state.nextMode = !state.nextMode;
  const toggle = ButtonBuilder.from(interaction.message.components[1].components[0])
    .setLabel(state.nextMode ? 'Mode: Play next' : 'Mode: Add to queue');
  const row0 = ActionRowBuilder.from(interaction.message.components[0]);
  await interaction.update({ components: [row0, new ActionRowBuilder().addComponents(toggle)] }).catch(() => {});
}

module.exports = { buildSuggestMessage, buildArtistSuggest, buildRelatedSuggest, handleSuggestMenu, handleSuggestMode, rememberMenu };
