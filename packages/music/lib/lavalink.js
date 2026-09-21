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

  manager.on('trackStart', (player, track) => {
    const existingTimer = leaveTimers.get(player.guildId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      leaveTimers.delete(player.guildId);
    }

    const channel = client.channels.cache.get(player.textChannelId);
    if (!channel) return;

    const { buildControlRow, buildNowPlayingEmbed } = require('./buttons');

    channel.send({
      embeds: [buildNowPlayingEmbed(track, player)],
      components: buildControlRow(player),
    }).catch(() => {});
  });

  manager.on('queueEnd', (player) => {
    const channel = client.channels.cache.get(player.textChannelId);
    channel?.send('📭 Queue finished. Add more with `/play`.').catch(() => {});

    if (!get247(player.guildId)) {
      const timer = setTimeout(() => {
        channel?.send('👋 Leaving voice — queue empty for 5 minutes. Use `/247` to keep me connected permanently.').catch(() => {});
        player.destroy().catch(() => {});
        leaveTimers.delete(player.guildId);
      }, 5 * 60 * 1000);
      leaveTimers.set(player.guildId, timer);
    }
  });

  manager.on('trackError', (player, track, payload) => {
    console.error('Track error:', payload?.exception?.message || payload);
    const channel = client.channels.cache.get(player.textChannelId);
    channel?.send(`⚠️ Error playing **${track?.info?.title || 'track'}**, skipping.`).catch(() => {});
  });

  return manager;
}

function initManager(client) {
  manager.init({ id: client.user.id, username: client.user.username });
}

function getManager() {
  return manager;
}

async function searchTrack(query, requestUser) {
  const node = manager.nodeManager.leastUsedNodes()[0];
  if (!node) throw new Error('No Lavalink node connected. Check LAVALINK_* env vars.');

  const isUrl = /^https?:\/\//i.test(query);
  const res = await node.search({ query, source: isUrl ? undefined : 'ytsearch' }, requestUser);

  if (!res || !res.tracks || res.tracks.length === 0) return null;

  const track = res.tracks[0];
  track.requester = requestUser;
  return track;
}

function getOrCreatePlayer(interaction) {
  const voiceChannel = interaction.member.voice.channel;
  let player = manager.getPlayer(interaction.guild.id);

  if (!player) {
    player = manager.createPlayer({
      guildId: interaction.guild.id,
      voiceChannelId: voiceChannel.id,
      textChannelId: interaction.channel.id,
      selfDeaf: true,
    });
  }

  return player;
}

module.exports = { attachLavalink, initManager, getManager, searchTrack, getOrCreatePlayer };