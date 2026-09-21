const { EmbedBuilder } = require('discord.js');
const { getAllEnabledGuilds } = require('./pingStore');

const lastAlertedVideoIds = new Map();
const lastCheckedAt = new Map();

const DEFAULT_ALERT = '🔴 **{channel}** is live now! {url}';

async function checkGuild(client, guild) {
  const { guild_id: guildId, youtube_channel_id: youtubeChannelId, live_alert_channel_id: liveAlertChannelId } = guild;
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return;

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${youtubeChannelId}&eventType=live&type=video&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.items || data.items.length === 0) return;

    const live = data.items[0];
    const videoId = live.id.videoId;

    if (lastAlertedVideoIds.get(guildId) === videoId) return;
    lastAlertedVideoIds.set(guildId, videoId);

    const alertChannel = client.channels.cache.get(liveAlertChannelId);
    if (!alertChannel) return;

    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const template = guild.alert_message || DEFAULT_ALERT;
    const content = template
      .replaceAll('{channel}', live.snippet.channelTitle)
      .replaceAll('{title}', live.snippet.title)
      .replaceAll('{url}', watchUrl);

    const mention = guild.mention_role_id ? `<@&${guild.mention_role_id}> ` : '';

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setAuthor({ name: live.snippet.channelTitle })
      .setTitle(live.snippet.title)
      .setURL(watchUrl)
      .setDescription(live.snippet.description?.slice(0, 200) || '')
      .setImage(live.snippet.thumbnails?.high?.url || live.snippet.thumbnails?.default?.url)
      .setFooter({ text: 'Dominyx • YouTube Live' })
      .setTimestamp();

    await alertChannel.send({ content: `${mention}${content}`, embeds: [embed] });
  } catch (err) {
    console.error(`YouTube live-check error (guild ${guildId}):`, err.message);
  }
}

async function checkAllGuilds(client) {
  const now = Date.now();
  const guilds = await getAllEnabledGuilds();
  for (const g of guilds) {
    const intervalMs = (Number.isInteger(g.poll_minutes) ? g.poll_minutes : 10) * 60 * 1000;
    if (now - (lastCheckedAt.get(g.guild_id) || 0) < intervalMs) continue;
    lastCheckedAt.set(g.guild_id, now);
    await checkGuild(client, g);
  }
}

function startLivePolling(client) {
  const fallbackMinutes = Number(process.env.YOUTUBE_POLL_MINUTES || 10);
  console.log(`📡 YouTube live-check loop running (per-server interval, default ${fallbackMinutes}m).`);

  setTimeout(() => checkAllGuilds(client), 15_000);
  setInterval(() => checkAllGuilds(client), 60 * 1000);
}

module.exports = { startLivePolling };