const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getOrCreatePlayer, searchTrack, getManager } = require('../lib/lavalink');
const { getMusicSettings } = require('../lib/settings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song by name or link, or add it to the queue')
    .addStringOption(opt =>
      opt.setName('song')
        .setDescription('Song name or YouTube link')
        .setRequired(true)),

  async execute(interaction) {
    const member = interaction.member ?? await interaction.guild.members.fetch(interaction.user.id);
    const voiceChannel = member.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: '🚫 Join a voice channel first.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();

    // Gate: if the Lavalink node is down, kick off a reconnect and wait briefly.
    // Re-fetch the node every tick: the manager may have replaced the object.
    const getNode = () => {
      try { return getManager()?.nodeManager?.nodes?.get('main'); } catch { return null; }
    };
    let node = getNode();
    if (!node?.connected) {
      await interaction.editReply('🔄 Reconnecting to the music server, one sec…');
      try { await node?.connect?.(); } catch {}
      const reconnected = await new Promise((resolve) => {
        const check = setInterval(() => {
          node = getNode();
          if (node?.connected) {
            clearInterval(check);
            resolve(true);
          }
        }, 500);
        setTimeout(() => { clearInterval(check); resolve(false); }, 8000);
      });
      if (!reconnected) {
        return interaction.editReply('⚠️ Music server is still down — try again in a bit. If it persists, the Lavalink host itself is offline.');
      }
    }

    const settings = await getMusicSettings(interaction.guild.id);
    const query = interaction.options.getString('song');

    let result;
    try {
      result = await searchTrack(query, interaction.user.tag);
    } catch (err) {
      const msg = /No Lavalink node|not initialized/i.test(err.message)
        ? '🔌 Music server is unreachable — try again in a bit. If it persists, the Lavalink host is offline.'
        : `⚠️ Search failed: ${err.message}`;
      return interaction.editReply(msg);
    }

    if (!result) {
      return interaction.editReply('❌ Couldn\'t find that song.');
    }
    const { track, tracks, playlistName, isPlaylist } = result;

    let player;
    try {
      player = getOrCreatePlayer(interaction, { volume: settings.defaultVolume });
      if (!player.connected) await player.connect();
    } catch (err) {
      try { await player?.destroy?.().catch(() => {}); } catch {}
      const msg = /voice channel/i.test(err.message)
        ? '🚫 Join a voice channel first.'
        : '🔌 Could not join voice (permissions? channel full?). I cleaned up — try `/play` again.';
      return interaction.editReply(msg);
    }

    if (player.queue.tracks.length >= settings.maxQueue) {
      return interaction.editReply(`🚫 Queue is full (max ${settings.maxQueue} songs). Use \`/skip\` or \`/stop\` to make room.`);
    }

    // Playlists: fill the queue in order, capped at maxQueue.
    // Plain searches: first match only.
    const room = settings.maxQueue - player.queue.tracks.length;
    const toAdd = isPlaylist ? tracks.slice(0, Math.max(room, 1)) : [track];
    for (const t of toAdd) player.queue.add(t);

    if (!player.playing && !player.paused) {
      try {
        await player.play();
      } catch (err) {
        return interaction.editReply(`❌ Couldn't start playback: ${err.message || err}`);
      }
      // No "Loading..." spam — trackStart posts the now-playing card.
      // Just clear the deferred reply; errors still arrive via followUp.
      await interaction.deleteReply().catch(() => {});
      // Watchdog: "Loading" that never resolves means Lavalink couldn't start
      // the audio (blocked source / dead node) — say so instead of hanging.
      setTimeout(async () => {
        try {
          const p = getManager().getPlayer(interaction.guild.id);
          if (p && !p.playing && !p.paused && p.queue.current?.info?.title === track.info.title) {
            await interaction.followUp({
              content: `❌ **${track.info.title}** never started — the audio source is blocking this server. Try a Spotify/SoundCloud link or another song.`,
              flags: MessageFlags.Ephemeral,
            }).catch(() => {});
          }
        } catch {}
      }, 12000).unref?.();
      return;
    } else {
      if (isPlaylist && toAdd.length > 1) {
        await interaction.editReply(`➕ Queued playlist **${playlistName || 'mix'}** — **${toAdd.length}** songs in order (now at ${player.queue.tracks.length}).`);
      } else {
        await interaction.editReply(`➕ Added to queue: **${track.info.title}** (position ${player.queue.tracks.length})`);
      }
    }
  },
};
