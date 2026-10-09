const { EmbedBuilder, MessageFlags, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { similarTracks } = require('./reco');
const { searchTrack, getManager, getOrCreatePlayer } = require('./lavalink');
const { getMusicSettings } = require('./settings');

// messageId -> { items: [query], nextMode: bool }
const menus = new Map();

function rememberMenu(messageId, items) {
  menus.set(messageId, { items, nextMode: false });
  if (menus.size > 200) menus.delete(menus.keys().next().value);
}

async function buildSuggestMessage(seedTitle, seedArtist) {
  const queries = await similarTracks(seedTitle, seedArtist, 5);
  const options = queries.map((q, i) => ({
    label: q.slice(0, 100),
    value: String(i),
    description: 'Add to queue',
  }));
  const menu = new StringSelectMenuBuilder()
    .setCustomId('suggest_pick')
    .setPlaceholder('Pick a song to queue…')
    .addOptions(options);
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
    queries,
  };
}

async function handleSuggestMenu(interaction) {
  const state = menus.get(interaction.message.id);
  if (!state) {
    return interaction.reply({ content: '❌ This menu expired — run `/suggest` again.', flags: MessageFlags.Ephemeral });
  }
  const idx = Number(interaction.values[0]);
  const query = state.items[idx];
  if (!query) {
    return interaction.reply({ content: '❌ Bad pick.', flags: MessageFlags.Ephemeral });
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  let result;
  try {
    result = await searchTrack(query, interaction.user.tag, interaction.user.id);
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

module.exports = { buildSuggestMessage, handleSuggestMenu, handleSuggestMode, rememberMenu };
