const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const { getManager } = require('./lavalink');

const ICONS = {
  voldown: '<:music_voldown:1543902056882896936>',
  volup: '<:music_volup:1543902054345343027>',
  pause: '<:music_pause:1543727712483549317>',
  play: '<:music_play:1543727702832586802>',
  skip: '<:music_skip:1543727710113759384>',
  prev: '<:music_prev:1543727707853033604>',
  loop: '<:music_loop:1543727705340772545>',
  seekback: '<:music_seekback:1543727700651548833>',
  seekforward: '<:music_seekforward:1543902278833148044>',
  shuffle: '<:music_shuffle:1543727698579554426>',
  stop: '<:music_stop:1543727696259846234>',
};

function formatDuration(ms) {
  if (!ms || ms <= 0) return 'Live/Unknown';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function buildNowPlayingEmbed(track, player) {
  const title = track?.info?.title || 'Unknown track';
  return new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🎵 Now Playing')
    .setDescription(`**${title}**`)
    .setThumbnail(track?.info?.artworkUrl || null)
    .addFields(
      { name: 'Duration', value: formatDuration(track?.info?.duration), inline: true },
      { name: 'Artist', value: track?.info?.author || 'Unknown', inline: true },
      { name: 'Requested by', value: `${track?.requester || 'someone'}`, inline: true },
      { name: 'Volume', value: `${player?.volume ?? 100}%`, inline: true },
      { name: 'Loop', value: String(player?.repeatMode ?? 'off'), inline: true },
    );
}

function buildControlRow(player) {
  const isPaused = player?.paused;

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('music_voldown').setEmoji(ICONS.voldown).setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('music_previous').setEmoji(ICONS.prev).setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('music_pauseresume').setEmoji(isPaused ? ICONS.play : ICONS.pause).setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('music_skip').setEmoji(ICONS.skip).setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('music_volup').setEmoji(ICONS.volup).setStyle(ButtonStyle.Danger),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('music_seekback').setEmoji(ICONS.seekback).setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('music_loop').setEmoji(ICONS.loop).setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('music_stop').setEmoji(ICONS.stop).setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('music_shuffle').setEmoji(ICONS.shuffle).setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('music_seekforward').setEmoji(ICONS.seekforward).setStyle(ButtonStyle.Danger),
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('music_suggest').setLabel('💡 Suggestions').setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2, row3];
}

async function handleMusicButton(interaction) {
  let player;
  try {
    player = getManager()?.getPlayer(interaction.guild.id);
  } catch {
    player = null;
  }

  if (!player) {
    return interaction.reply({ content: '🚫 Nothing is playing anymore.', flags: MessageFlags.Ephemeral });
  }

  const id = interaction.customId;
  const track = player.queue.current;

  async function refresh() {
    try {
      return await interaction.update({
        embeds: track ? [buildNowPlayingEmbed(track, player)] : [],
        components: buildControlRow(player),
      });
    } catch {
      return interaction.followUp({ content: '✅ Done.', flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }

  try {
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
      const rawPrev = player.queue.previous;
      const prev = Array.isArray(rawPrev) ? rawPrev[0] : rawPrev;
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

    if (id === 'music_seekforward' || id === 'music_seekback') {
      if (!track) return interaction.reply({ content: '🚫 Nothing playing.', flags: MessageFlags.Ephemeral });
      if (!track.info?.isSeekable || !track.info?.duration) {
        return interaction.reply({ content: '🚫 Can\u2019t seek in this stream (live/unseekable).', flags: MessageFlags.Ephemeral });
      }
      const delta = id === 'music_seekforward' ? 10000 : -10000;
      const newPos = Math.min(track.info.duration, Math.max(0, (player.position || 0) + delta));
      await player.seek(newPos);
      return interaction.reply({ content: id === 'music_seekforward' ? '⏩ Skipped forward 10s.' : '⏪ Rewound 10s.', flags: MessageFlags.Ephemeral });
    }

    if (id === 'music_suggest') {
      if (!track) return interaction.reply({ content: '🚫 Nothing playing.', flags: MessageFlags.Ephemeral });
      const { buildSuggestMessage, rememberMenu } = require('./suggestMenu');
      const built = await buildSuggestMessage(track.info.title, track.info.author || '');
      const msg = await interaction.reply({ embeds: built.embeds, components: built.components, fetchReply: true }).catch(() => null);
      if (msg) rememberMenu(msg.id, built.queries);
      return;
    }

    return interaction.reply({ content: '❓ Unknown button.', flags: MessageFlags.Ephemeral });
  } catch (err) {
    console.error('Music button error:', err.message || err);
    const errMsg = { content: '⚠️ That didn\u2019t work — try again.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) return interaction.followUp(errMsg).catch(() => {});
    return interaction.reply(errMsg).catch(() => {});
  }
}

module.exports = { buildControlRow, buildNowPlayingEmbed, handleMusicButton };
