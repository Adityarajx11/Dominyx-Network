const { pool } = require('@dominyx/core');

async function initHistoryTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS play_history (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_tag TEXT,
      title TEXT,
      artist TEXT,
      track_id TEXT,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      duration_sec INTEGER DEFAULT 0,
      listened_sec INTEGER DEFAULT 0,
      status TEXT DEFAULT 'completed'
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_history_guild_time ON play_history (guild_id, started_at);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_history_guild_user_time ON play_history (guild_id, user_id, started_at);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_history_guild_artist ON play_history (guild_id, artist);`);
  console.log('🎵 Play history table ready.');
}

async function startPlay({ guildId, userId, userTag, title, artist, trackId, durationSec }) {
  const res = await pool.query(
    `INSERT INTO play_history (guild_id, user_id, user_tag, title, artist, track_id, duration_sec)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [guildId, userId, userTag || null, title || 'Unknown', artist || 'Unknown', trackId || null, durationSec || 0]
  );
  return res.rows[0].id;
}

async function finishPlay(id, { listenedSec, status }) {
  if (!id) return;
  await pool.query(
    `UPDATE play_history SET listened_sec = $2, status = $3 WHERE id = $1`,
    [id, Math.max(0, Math.round(listenedSec || 0)), status || 'completed']
  ).catch(() => {});
}

function periodSince(period) {
  const now = new Date();
  if (period === 'today') {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (period === 'month') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return null;
}

function fmtTime(totalSec) {
  totalSec = Math.max(0, Math.round(totalSec || 0));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

async function getUserStats(guildId, userId, period = 'week') {
  const since = periodSince(period);
  const args = [guildId, userId];
  let when = '';
  if (since) {
    when = 'AND started_at >= $3';
    args.push(since);
  }
  const res = await pool.query(
    `SELECT COUNT(*)::int AS songs,
            COALESCE(SUM(listened_sec), 0)::int AS listened,
            COUNT(DISTINCT artist)::int AS artists
     FROM play_history WHERE guild_id = $1 AND user_id = $2 ${when}`,
    args
  );
  const topArtists = await pool.query(
    `SELECT artist, COUNT(*)::int AS plays, COALESCE(SUM(listened_sec),0)::int AS listened
     FROM play_history WHERE guild_id = $1 AND user_id = $2 ${when}
     GROUP BY artist ORDER BY plays DESC LIMIT 5`,
    args
  );
  const history = await pool.query(
    `SELECT title, artist, listened_sec, status, started_at
     FROM play_history WHERE guild_id = $1 AND user_id = $2 ${when}
     ORDER BY started_at DESC LIMIT 10`,
    args
  );
  return { ...res.rows[0], topArtists: topArtists.rows, history: history.rows };
}

async function getServerStats(guildId, period = 'week') {
  const since = periodSince(period);
  const args = [guildId];
  let when = '';
  if (since) {
    when = 'AND started_at >= $2';
    args.push(since);
  }
  const res = await pool.query(
    `SELECT COUNT(*)::int AS tracks,
            COALESCE(SUM(listened_sec), 0)::int AS listened,
            COUNT(DISTINCT user_id)::int AS requesters
     FROM play_history WHERE guild_id = $1 ${when}`,
    args
  );
  const topArtists = await pool.query(
    `SELECT artist, COUNT(*)::int AS plays
     FROM play_history WHERE guild_id = $1 ${when}
     GROUP BY artist ORDER BY plays DESC LIMIT 5`,
    args
  );
  const topSongs = await pool.query(
    `SELECT title, artist, COUNT(*)::int AS plays
     FROM play_history WHERE guild_id = $1 ${when}
     GROUP BY title, artist ORDER BY plays DESC LIMIT 5`,
    args
  );
  return { ...res.rows[0], topArtists: topArtists.rows, topSongs: topSongs.rows };
}

async function getLastGuildTrack(guildId) {
  const res = await pool.query(
    `SELECT title, artist FROM play_history WHERE guild_id = $1 ORDER BY started_at DESC LIMIT 1`,
    [guildId]
  );
  return res.rows[0] || null;
}

module.exports = { initHistoryTables, startPlay, finishPlay, getUserStats, getServerStats, getLastGuildTrack, fmtTime };
