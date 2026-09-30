const { LavalinkManager } = require('lavalink-client');
const { get247 } = require('./settings');

let manager;
const leaveTimers = new Map();

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
    console.log(`🔄 Lavalink node "${node.id}" reconnecting…`);
  });

  manager.on('trackStart', async (player, track) => {
    const existingTimer = leaveTimers.get(player.guildId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      leaveTimers.delete(player.guildId);
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
    const channel = client.channels.cache.get(player.textChannelId);
    channel?.send('📭 Queue finished. Add more with `/play`.').catch(() => {});

    let stay247 = false;
    let timeoutMinutes = 5;
    try {
      const { getMusicSettings } = require('./settings');
      const settings = await getMusicSettings(player.guildId);
      stay247 = settings.stay247;
      timeoutMinutes = settings.leaveTimeoutMinutes;
    } catch {}
    if (!stay247) {      const timer = setTimeout(() => {
        channel?.send(`👋 Leaving voice — queue empty for ${timeoutMinutes} minute(s). Use \`/247\` to keep me connected permanently.`).catch(() => {});
        player.destroy().catch(() => {});
        leaveTimers.delete(player.guildId);
      }, timeoutMinutes * 60 * 1000);
      leaveTimers.set(player.guildId, timer);
    }
  });

  manager.on('trackError', (player, track, payload) => {
    console.error('Track error:', payload?.exception?.message || payload);
    const channel = client.channels.cache.get(player.textChannelId);
    channel?.send(`⚠️ Error playing **${track?.info?.title || 'track'}**, skipping.`).catch(() => {});
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

async function searchTrack(query, requestUser) {
  const node = manager.nodeManager.leastUsedNodes()[0];
  if (!node) throw new Error('No Lavalink node connected. Check LAVALINK_* env vars.');

  const isUrl = /^https?:\/\//i.test(query);
  const res = await node.search({ query, source: isUrl ? undefined : 'ytsearch' }, requestUser);

  if (!res || !res.tracks || res.tracks.length === 0) return null;

  // Playlists ONLY come from links. Word searches return many candidates too —
  // those are never playlists, take #1. (Some hosts mislabel searches.)
  const tracks = res.tracks.map((t) => {
    t.requester = requestUser;
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
  const voiceChannel = interaction.member.voice.channel;
  let player = manager.getPlayer(interaction.guild.id);

  if (!player) {
    player = manager.createPlayer({
      guildId: interaction.guild.id,
      voiceChannelId: voiceChannel.id,
      textChannelId: interaction.channel.id,
      selfDeaf: true,
      ...(Number.isInteger(opts.volume) ? { volume: opts.volume } : {}),
    });
  }

  return player;
}

module.exports = { attachLavalink, initManager, getManager, searchTrack, getOrCreatePlayer, cancelLeave };