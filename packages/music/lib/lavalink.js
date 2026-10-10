const { LavalinkManager } = require('lavalink-client');
const { get247 } = require('./settings');

let manager;
const leaveTimers = new Map();
const openPlays = new Map(); // guildId -> play_history id of the live track

function attachLavalink(client) {
  const lavalinkHost = process.env.LAVALINK_HOST;
  const lavalinkPassword = process.env.LAVALINK_PASSWORD;
  const lavalinkPort = Number(process.env.LAVALINK_PORT || 443);
  const lavalinkSecure = process.env.LAVALINK_SECURE === 'true';

  const missing = [!lavalinkHost && 'LAVALINK_HOST', !lavalinkPassword && 'LAVALINK_PASSWORD'].filter(Boolean);
  if (missing.length > 0) {
    console.error(
      `❌ Lavalink misconfigured — missing ${missing.join(' and ')}. ` +
        'The node can never connect; /play will fail with "No Lavalink node connected" until these env vars are set.'
    );
  } else {
    console.log(
      `🎧 Lavalink node "main" configured → ${lavalinkSecure ? 'wss' : 'ws'}://${lavalinkHost}:${lavalinkPort} (connecting on ready…)`
    );
  }

  manager = new LavalinkManager({
    nodes: [
      {
        id: 'main',
        host: lavalinkHost,
        port: lavalinkPort,
        authorization: lavalinkPassword,
        secure: lavalinkSecure,
        // Reconnect retry configuration: prevents tight reconnect loops
        // retryAmount: max attempts before giving up
        // retryDelay: initial delay in ms; increases by 250ms per attempt, capped at 30 seconds
        retryAmount: 5,
        retryDelay: 20000,
        resuming: {
          enabled: true,
          timeout: 60,
        },
      },
    ],
    sendToShard: (guildId, payload) => client.guilds.cache.get(guildId)?.shard?.send(payload),
    client: {
      id: client.user?.id,
      username: client.user?.username || 'Bot',
    },
    queueOptions: {
      maxPreviousTracks: 25,
    },
  });

  client.on('raw', (d) => manager.sendRawData(d));

  manager.nodeManager.on('connect', (node) => {
    console.log(`🎧 Lavalink node "${node.id}" connected.`);
  });
  manager.nodeManager.on('error', (node, error) => {
    console.error(`⚠️ Lavalink node "${node.id}" error:`, error?.message || error);
  });
  manager.nodeManager.on('disconnect', (node, reason) => {
    console.warn(`🔌 Lavalink node "${node.id}" disconnected:`, reason?.message || reason || 'unknown reason');
  });
  manager.nodeManager.on('reconnecting', (node) => {
    console.log(`🔄 Lavalink node "${node.id}" reconnecting… (retry ${node.retryCount ?? '?'})`);
  });

  manager.on('trackStart', async (player, track) => {
    const existingTimer = leaveTimers.get(player.guildId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      leaveTimers.delete(player.guildId);
    }

    // Phase 1 stats: record actual playback (not the /play command).
    // Phase 2 XP: award requester, then sync tier role.
    try {
      const { startPlay } = require('./history');
      const id = await startPlay({
        guildId: player.guildId,
        userId: track.requesterId || 'unknown',
        userTag: track.requester || null,
        title: track.info?.title || 'Unknown',
        artist: track.info?.author || 'Unknown',
        trackId: track.info?.identifier || track.info?.uri || null,
        url: track.info?.uri || null,
        durationSec: Math.round((track.info?.duration || 0) / 1000),
      });
      openPlays.set(player.guildId, id);
    } catch {}
    if (track.requesterId && track.requesterId !== 'unknown') {
      try {
        const { awardTrackXp, syncTierRole } = require('./musicXp');
        await awardTrackXp(player.guildId, track.requesterId, track.info?.author || 'Unknown');
        await syncTierRole(client, player.guildId, track.requesterId);
      } catch {}
    }

    let channel = client.channels.cache.get(player.textChannelId);
    try {
      const { getMusicSettings } = require('./settings');
      const settings = await getMusicSettings(player.guildId);
      if (settings.announceChannelId) {
        channel = client.channels.cache.get(settings.announceChannelId) || channel;
      }
    } catch {}
    if (!channel) return;

    const { buildControlRow, buildNowPlayingEmbed } = require('./buttons');

    channel.send({
      embeds: [buildNowPlayingEmbed(track, player)],
      components: buildControlRow(player),
    }).catch(() => {});
  });

  manager.on('queueEnd', async (player) => {
    // Sleep timer: queue-end mode fires here instead of the normal leave flow.
    try {
      const { getTimer, fireTimer } = require('./sleepTimer');
      const timer = await getTimer(player.guildId).catch(() => null);
      if (timer && timer.mode === 'queue') {
        await fireTimer(client, player.guildId);
        return;
      }
    } catch {}
    const channel = client.channels.cache.get(player.textChannelId);
    channel?.send('📭 Queue finished. Add more with `/play`.')
      .then((m) => setTimeout(() => m.delete().catch(() => {}), 30000))
      .catch(() => {});

    let stay247 = false;
    let timeoutMinutes = 5;
    try {
      const { getMusicSettings } = require('./settings');
      const settings = await getMusicSettings(player.guildId);
      stay247 = settings.stay247;
      timeoutMinutes = settings.leaveTimeoutMinutes;
    } catch {}
    if (!stay247) {
      cancelLeave(player.guildId);
      const timer = setTimeout(() => {
        channel?.send(`👋 Leaving voice — queue empty for ${timeoutMinutes} minute(s). Use \`/247\` to keep me connected permanently.`)
          .then((m) => setTimeout(() => m.delete().catch(() => {}), 30000))
          .catch(() => {});
        player.destroy().catch(() => {});
        leaveTimers.delete(player.guildId);
      }, timeoutMinutes * 60 * 1000);
      leaveTimers.set(player.guildId, timer);
    }
  });

  manager.on('trackEnd', async (player, track, payload) => {
    const id = openPlays.get(player.guildId);
    openPlays.delete(player.guildId);
    const reason = payload?.reason || '';
    if (id) {
      try {
        const { finishPlay } = require('./history');
        const posSec = Math.round((player.position || 0) / 1000);
        const durSec = Math.round((track?.info?.duration || 0) / 1000);
        const completed = reason === 'finished' || (durSec > 0 && posSec >= durSec - 2);
        await finishPlay(id, {
          listenedSec: durSec > 0 ? Math.min(posSec, durSec) : posSec,
          status: completed ? 'completed' : 'skipped',
        });
      } catch {}
    }
    // Sleep timer: song/count modes tick on normal completions only.
    try {
      const { onTrackEnd } = require('./sleepTimer');
      await onTrackEnd(client, player.guildId, reason === 'finished' || reason === '');
    } catch {}
    // Radio: refill when the queue runs low.
    try {
      const { refillRadio } = require('./radio');
      await refillRadio(client, player.guildId);
    } catch {}
  });

  manager.on('trackError', (player, track, payload) => {
    console.error('Track error:', payload?.exception?.message || payload);
    const channel = client.channels.cache.get(player.textChannelId);
    channel?.send(`⚠️ Error playing **${track?.info?.title || 'track'}**, skipping.`).catch(() => {});
    player.skip(0, false).catch(() => {});
  });

  manager.on('trackStuck', (player, track, payload) => {
    console.error('Track stuck:', payload?.message || payload);
    const channel = client.channels.cache.get(player.textChannelId);
    channel?.send(`⚠️ **${track?.info?.title || 'Track'}** got stuck and never started, skipping.`).catch(() => {});
    player.skip(0, false).catch(() => {});
  });

  return manager;
}

function initManager(client) {
  manager.init({ id: client.user.id, username: client.user.username });
}

function getManager() {
  return manager;
}

function cancelLeave(guildId) {
  const timer = leaveTimers.get(guildId);
  if (timer) {
    clearTimeout(timer);
    leaveTimers.delete(guildId);
  }
}

// Embed-safe requester display: mention if we know the id (no ping in embeds),
// plain name otherwise.
function requesterMention(track) {
  const id = track?.requesterId;
  if (id && id !== 'unknown' && /^\d{17,20}$/.test(String(id))) return `<@${id}>`;
  return track?.requester || 'someone';
}

// A finished/stopped track lingers as queue.current with stale flags.
// Call before starting something new so it actually plays instead of queuing.
function clearStaleCurrent(player) {
  try {
    if (player && !player.playing && !player.paused && player.queue?.current) {
      player.queue.current = null;
    }
  } catch {}
}
// Consume the open history row for a guild (voice-leave early finish).
function takeOpenPlay(guildId) {
  const id = openPlays.get(guildId);
  openPlays.delete(guildId);
  return id || null;
}

async function searchTrack(query, requestUser, requestUserId) {
  if (!manager) throw new Error('Lavalink not initialized yet — try again in a few seconds.');
  let node = manager.nodeManager.leastUsedNodes().find((n) => n.connected);
  if (!node) {
    // One last chance: the node may be mid-reconnect (bounded retries).
    try { await manager.nodeManager.nodes.get('main')?.connect?.(); } catch {}
    await new Promise((r) => setTimeout(r, 3000));
    node = manager.nodeManager.leastUsedNodes().find((n) => n.connected);
  }
  if (!node) throw new Error('No Lavalink node connected. Check LAVALINK_* env vars.');

  const isUrl = /^https?:\/\//i.test(query);
  const res = await node.search({ query, source: isUrl ? undefined : 'ytsearch' }, requestUser);

  if (!res || !res.tracks || res.tracks.length === 0) return null;

  // Playlists ONLY come from links. Word searches return many candidates too —
  // those are never playlists, take #1. (Some hosts mislabel searches.)
  const tracks = res.tracks.map((t) => {
    t.requester = requestUser;
    t.requesterId = requestUserId || null;
    return t;
  });
  console.log(`[music] search "${String(query).slice(0, 60)}" → loadType=${res.loadType} tracks=${tracks.length} isUrl=${isUrl}`);
  // Only REAL playlists/albums queue many songs. Plain video/track links and
  // YouTube Mixes (list=RD...) play single — never "similar songs" dumps.
  function wantsPlaylist(url) {
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^(www\.|open\.|m\.|music\.)/, '');
      if (host.includes('spotify.com')) return /\/(album|playlist)\//.test(u.pathname);
      if (host.includes('youtube.com') || host === 'youtu.be') {
        const list = u.searchParams.get('list');
        if (!list || /^RD/.test(list)) return false;
        return true;
      }
      if (host.includes('soundcloud.com')) return /\/sets\//.test(u.pathname);
      return false;
    } catch {
      return false;
    }
  }
  const isPlaylist = isUrl && wantsPlaylist(query) && tracks.length > 1;
  return {
    track: tracks[0],
    tracks,
    playlistName: res.playlist?.name || res.playlist?.title || null,
    isPlaylist,
  };
}

function getOrCreatePlayer(interaction, opts = {}) {
  if (!manager) throw new Error('Lavalink not initialized yet — try again in a few seconds.');
  const voiceChannel = interaction.member?.voice?.channel;
  if (!voiceChannel) throw new Error('Join a voice channel first.');
  let player = manager.getPlayer(interaction.guild.id);

  if (!player) {
    cancelLeave(interaction.guild.id);
    player = manager.createPlayer({
      guildId: interaction.guild.id,
      voiceChannelId: voiceChannel.id,
      textChannelId: interaction.channel.id,
      selfDeaf: true,
      ...(Number.isInteger(opts.volume) ? { volume: opts.volume } : {}),
    });
  } else {
    // Reused player: sync to the live channels so replies/now-playing
    // don't go stale, and drop any pending auto-leave.
    cancelLeave(interaction.guild.id);
    try {
      if (voiceChannel && player.voiceChannelId !== voiceChannel.id && typeof player.setVoiceChannel === 'function') {
        player.setVoiceChannel(voiceChannel.id).catch(() => {});
      }
      if (interaction.channel?.id && player.textChannelId !== interaction.channel.id && typeof player.setTextChannel === 'function') {
        player.setTextChannel(interaction.channel.id).catch(() => {});
      } else if (interaction.channel?.id) {
        player.textChannelId = interaction.channel.id;
      }
    } catch {}
  }

  return player;
}

module.exports = { attachLavalink, initManager, getManager, searchTrack, getOrCreatePlayer, cancelLeave, takeOpenPlay, clearStaleCurrent, requesterMention };
