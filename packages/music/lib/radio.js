const { pool } = require('@dominyx/core');
const { similarTracks, similarArtists } = require('./reco');
const { searchTrack, getManager, getOrCreatePlayer } = require('./lavalink');
const { getMusicSettings } = require('./settings');

async function initRadioTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS radio_sessions (
      guild_id TEXT PRIMARY KEY,
      seed_artist TEXT,
      mode TEXT DEFAULT 'mix',
      queue_ids JSONB DEFAULT '[]'::jsonb,
      active BOOLEAN DEFAULT true,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE radio_sessions ADD COLUMN IF NOT EXISTS radio_channel_id TEXT;`);
  await pool.query(`ALTER TABLE radio_sessions ADD COLUMN IF NOT EXISTS radio_message_id TEXT;`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_favs (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      track_id TEXT NOT NULL,
      title TEXT,
      artist TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, guild_id, track_id)
    );
  `);
  console.log('🎵 Radio tables ready.');
}

async function startRadio(guildId, seedArtist, mode = 'mix') {
  await pool.query(
    `INSERT INTO radio_sessions (guild_id, seed_artist, mode, queue_ids, active, updated_at)
     VALUES ($1, $2, $3, '[]'::jsonb, true, NOW())
     ON CONFLICT (guild_id) DO UPDATE SET seed_artist = $2, mode = $3,
       queue_ids = '[]'::jsonb, active = true, updated_at = NOW()`,
    [guildId, seedArtist, mode]
  );
}

async function stopRadio(guildId) {
  await pool.query('UPDATE radio_sessions SET active = false WHERE guild_id = $1', [guildId]);
}

async function setRadioMessage(guildId, channelId, messageId) {
  await pool.query(
    'UPDATE radio_sessions SET radio_channel_id = $2, radio_message_id = $3 WHERE guild_id = $1',
    [guildId, channelId || null, messageId || null]
  ).catch(() => {});
}

// Refresh the posted radio card: now-playing + up-next. Silent on failure.
async function updateRadioMessage(client, guildId) {
  try {
    const session = await getRadio(guildId).catch(() => null);
    if (!session?.radio_channel_id || !session?.radio_message_id) return;
    let player;
    try {
      player = getManager()?.getPlayer(guildId);
    } catch {
      return;
    }
    if (!player) return;
    const channel = client.channels.cache.get(session.radio_channel_id)
      ?? await client.channels.fetch(session.radio_channel_id).catch(() => null);
    if (!channel?.isTextBased?.()) return;
    const msg = await channel.messages.fetch(session.radio_message_id).catch(() => null);
    if (!msg || !msg.editable) return;
    const { EmbedBuilder } = require('discord.js');
    const cur = player.queue.current;
    const upNext = player.queue.tracks.slice(0, 3).map((t, i) => `${i + 1}. **${t.info?.title || 'Unknown'}**`).join('\n') || '_Queue empty — refilling…_';
    const embed = new EmbedBuilder()
      .setColor(0xEC4899)
      .setTitle(`📻 Radio: ${session.seed_artist}`)
      .setDescription(
        `Mode: **${session.mode === 'only' ? 'Artist Only' : 'Artist Mix'}**\n` +
        `▶️ Now: **${cur?.info?.title || '—'}**\n\n**Up next:**\n${upNext}`
      )
      .setFooter({ text: 'Dominyx • Radio' })
      .setTimestamp();
    const { sessionRows } = require('../commands/radio');
    await msg.edit({ embeds: [embed], components: sessionRows() }).catch(() => {});
  } catch {}
}

async function getRadio(guildId) {
  const res = await pool.query('SELECT * FROM radio_sessions WHERE guild_id = $1', [guildId]);
  const row = res.rows[0];
  if (!row || !row.active) return null;
  return row;
}

async function rememberIds(guildId, ids) {
  const cur = await getRadio(guildId).catch(() => null);
  const have = Array.isArray(cur?.queue_ids) ? cur.queue_ids : [];
  const next = [...have, ...ids].slice(-200);
  await pool.query('UPDATE radio_sessions SET queue_ids = $2, updated_at = NOW() WHERE guild_id = $1', [
    guildId,
    JSON.stringify(next),
  ]);
}

// Fill the queue up to 5 upcoming using the provider. Session-level dedupe.
async function refillRadio(client, guildId, requestTag = 'radio') {
  const session = await getRadio(guildId).catch(() => null);
  if (!session) return 0;
  let player;
  try {
    player = getManager()?.getPlayer(guildId);
  } catch {
    return 0;
  }
  if (!player) return 0;
  const have = new Set([
    ...(Array.isArray(session.queue_ids) ? session.queue_ids : []),
    player.queue.current?.info?.identifier,
    ...player.queue.tracks.map((t) => t.info?.identifier),
  ].filter(Boolean));
  if (player.queue.tracks.length >= 5) return 0;

  let queries;
  if (session.mode === 'only') {
    queries = [`${session.seed_artist} top songs`, `${session.seed_artist} best songs`, `${session.seed_artist} mix`];
  } else {
    const artists = await similarArtists(session.seed_artist, 4);
    queries = artists.map((a) => `${a} best songs`);
    queries.unshift(`${session.seed_artist} best songs`);
  }

  let added = 0;
  for (const q of queries) {
    if (player.queue.tracks.length >= 5) break;
    let result;
    try {
      result = await searchTrack(q, requestTag, null);
    } catch {
      continue;
    }
    if (!result) continue;
    const id = result.track?.info?.identifier;
    if (!id || have.has(id)) continue;
    have.add(id);
    player.queue.add(result.track);
    added++;
    await rememberIds(guildId, [id]).catch(() => {});
  }
  if (added > 0 && !player.playing && !player.paused) {
    try {
      await player.play();
    } catch {}
  }
  return added;
}

async function favCurrent(userId, guildId) {
  let player;
  try {
    player = getManager()?.getPlayer(guildId);
  } catch {
    return null;
  }
  const cur = player?.queue?.current;
  if (!cur) return null;
  await pool.query(
    `INSERT INTO user_favs (user_id, guild_id, track_id, title, artist)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
    [userId, guildId, cur.info?.identifier || cur.info?.uri || 'x', cur.info?.title || 'Unknown', cur.info?.author || 'Unknown']
  );
  return { title: cur.info?.title || 'Unknown' };
}

module.exports = { initRadioTables, startRadio, stopRadio, getRadio, refillRadio, favCurrent, setRadioMessage, updateRadioMessage };
