const { EmbedBuilder } = require('discord.js');
const { getAllEnabledGuilds } = require('./pingStore');

const lastAlertedVideoIds = new Map();

async function checkGuild(client, guildId, youtubeChannelId, liveAlertChannelId) {
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

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setAuthor({ name: live.snippet.channelTitle })
      .setTitle(live.snippet.title)
      .setURL(`https://www.youtube.com/watch?v=${videoId}`)
      .setDescription(live.snippet.description?.slice(0, 200) || '')
      .setImage(live.snippet.thumbnails?.high?.url || live.snippet.thumbnails?.default?.url)
      .setFooter({ text: 'Dominyx • YouTube Live' })
      .setTimestamp();

    await alertChannel.send({
      content: `🔴 **${live.snippet.channelTitle}** is live now! https://www.youtube.com/watch?v=${videoId}`,
      embeds: [embed],
    });
  } catch (err) {
    console.error(`YouTube live-check error (guild ${guildId}):`, err.message);
  }
}

async function checkAllGuilds(client) {
  const guilds = await getAllEnabledGuilds();
  for (const g of guilds) {
    await checkGuild(client, g.guild_id, g.youtube_channel_id, g.live_alert_channel_id);
  }
}

function startLivePolling(client) {
  const intervalMinutes = Number(process.env.YOUTUBE_POLL_MINUTES || 10);
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`📡 YouTube live-check polling every ${intervalMinutes} minute(s).`);

  setTimeout(() => checkAllGuilds(client), 15_000);
  setInterval(() => checkAllGuilds(client), intervalMs);
}

module.exports = { startLivePolling };