const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const { getManager } = require('./lavalink');

const ICONS = {
  voldown: '🔉',
  volup: '🔊',
  pause: '⏸',
  play: '▶',
  skip: '⏭',
  prev: '⏮',
  loop: '🔁',
  seekback: '⏪',
  seekforward: '⏩',
  shuffle: '🔀',
  stop: '⏹',
};

function formatDuration(ms) {
  if (!ms || ms <= 0) return 'Live/Unknown';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function buildNowPlayingEmbed(track, player) {
  return new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🎵 Now Playing')
    .setDescription(`**${track.info.title}**`)
    .setThumbnail(track.info.artworkUrl || null)
    .addFields(
      { name: 'Duration', value: formatDuration(track.info.duration), inline: true },
      { name: 'Artist', value: track.info.author || 'Unknown', inline: true },
      { name: 'Requested by', value: `${track.requester}`, inline: true },
      { name: 'Volume', value: `${player.volume}%`, inline: true },
      { name: 'Loop', value: player.repeatMode, inline: true },
    );
}

function buildControlRow(player) {
  const isPaused = player?.paused;

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('music_previous').setEmoji(ICONS.prev).setLabel('Prev').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_pauseresume').setEmoji(isPaused ? ICONS.play : ICONS.pause).setLabel(isPaused ? 'Play' : 'Pause').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('music_skip').setEmoji(ICONS.skip).setLabel('Skip').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('music_loop').setEmoji(ICONS.loop).setLabel('Loop').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('music_stop').setEmoji(ICONS.stop).setLabel('Stop').setStyle(ButtonStyle.Danger),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('music_voldown').setEmoji(ICONS.voldown).setLabel('-10').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_volup').setEmoji(ICONS.volup).setLabel('+10').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_seekback').setEmoji(ICONS.seekback).setLabel('10s').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_seekforward').setEmoji(ICONS.seekforward).setLabel('10s').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_shuffle').setEmoji(ICONS.shuffle).setLabel('Shuffle').setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2];
}

async function handleMusicButton(interaction) {
  const player = getManager().getPlayer(interaction.guild.id);

  if (!player) {
    return interaction.reply({ content: '🚫 Nothing is playing anymore.', flags: MessageFlags.Ephemeral });
  }

  const id = interaction.customId;
  const track = player.queue.current;

  async function refresh() {
    return interaction.update({
      embeds: track ? [buildNowPlayingEmbed(track, player)] : [],
      components: buildControlRow(player),
    });
  }

  if (id === 'music_pauseresume') {
    if (player.paused) await player.resume();
    else await player.pause();
    return refresh();
  }

  if (id === 'music_skip') {
    if (!track) return interaction.reply({ content: '🚫 Nothing to skip.', flags: MessageFlags.Ephemeral });
    try {
      await player.skip(0, false);
    } catch (err) {
      return interaction.reply({ content: `❌ Skip failed: ${err.message || err}`, flags: MessageFlags.Ephemeral });
    }
    return interaction.reply({ content: '⏭️ Skipped.', flags: MessageFlags.Ephemeral });
  }

  if (id === 'music_previous') {
    const prev = player.queue.previous?.[0];
    if (!prev) return interaction.reply({ content: '🚫 No previous song.', flags: MessageFlags.Ephemeral });
    player.queue.tracks.unshift(prev);
    await player.skip();
    return interaction.reply({ content: '⏮️ Playing previous song.', flags: MessageFlags.Ephemeral });
  }

  if (id === 'music_stop') {
    player.queue.tracks.splice(0, player.queue.tracks.length);
    await player.stopPlaying(true);
    return interaction.update({ content: '⏹️ Playback stopped.', embeds: [], components: [] });
  }

  if (id === 'music_shuffle') {
    if (player.queue.tracks.length < 2) {
      return interaction.reply({ content: '🚫 Not enough songs to shuffle.', flags: MessageFlags.Ephemeral });
    }
    await player.queue.shuffle();
    return interaction.reply({ content: '🔀 Queue shuffled.', flags: MessageFlags.Ephemeral });
  }

  if (id === 'music_loop') {
    const order = ['off', 'track', 'queue'];
    const next = order[(order.indexOf(player.repeatMode) + 1) % order.length];
    player.setRepeatMode(next);
    return refresh();
  }

  if (id === 'music_volup') {
    const newVol = Math.min(200, player.volume + 10);
    await player.setVolume(newVol);
    return refresh();
  }

  if (id === 'music_voldown') {
    const newVol = Math.max(0, player.volume - 10);
    await player.setVolume(newVol);
    return refresh();
  }

  if (id === 'music_seekforward') {
    if (!track) return interaction.reply({ content: '🚫 Nothing playing.', flags: MessageFlags.Ephemeral });
    const newPos = Math.min(track.info.duration || Infinity, (player.position || 0) + 10000);
    await player.seek(newPos);
    return interaction.reply({ content: '⏩ Skipped forward 10s.', flags: MessageFlags.Ephemeral });
  }

  if (id === 'music_seekback') {
    if (!track) return interaction.reply({ content: '🚫 Nothing playing.', flags: MessageFlags.Ephemeral });
    const newPos = Math.max(0, (player.position || 0) - 10000);
    await player.seek(newPos);
    return interaction.reply({ content: '⏪ Rewound 10s.', flags: MessageFlags.Ephemeral });
  }
}

module.exports = { buildControlRow, buildNowPlayingEmbed, handleMusicButton };
