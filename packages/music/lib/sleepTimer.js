const { pool } = require('@dominyx/core');

async function initSleepTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sleep_timers (
      guild_id TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      expires_at TIMESTAMPTZ,
      songs_left INTEGER,
      end_action TEXT DEFAULT 'stop',
      channel_id TEXT,
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('🎵 Sleep timer table ready.');
}

async function setTimer(guildId, { mode, expiresAt, songsLeft, endAction, channelId, createdBy }) {
  await pool.query(
    `INSERT INTO sleep_timers (guild_id, mode, expires_at, songs_left, end_action, channel_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (guild_id) DO UPDATE SET mode = $2, expires_at = $3, songs_left = $4,
       end_action = $5, channel_id = $6, created_by = $7, created_at = NOW()`,
    [guildId, mode, expiresAt || null, songsLeft ?? null, endAction || 'stop', channelId || null, createdBy || null]
  );
}

async function getTimer(guildId) {
  const res = await pool.query('SELECT * FROM sleep_timers WHERE guild_id = $1', [guildId]);
  return res.rows[0] || null;
}

async function clearTimer(guildId) {
  await pool.query('DELETE FROM sleep_timers WHERE guild_id = $1', [guildId]);
}

async function allTimers() {
  const res = await pool.query('SELECT * FROM sleep_timers').catch(() => ({ rows: [] }));
  return res.rows;
}

function remainingText(timer) {
  if (!timer) return 'none';
  if (timer.mode === 'duration' && timer.expires_at) {
    const ms = new Date(timer.expires_at).getTime() - Date.now();
    if (ms <= 0) return 'due';
    const m = Math.round(ms / 60000);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m left` : `${m}m left`;
  }
  if (timer.mode === 'count') return `${timer.songs_left ?? 0} song(s) left`;
  if (timer.mode === 'song') return 'after this song';
  if (timer.mode === 'queue') return 'when the queue ends';
  return timer.mode;
}

async function fireTimer(client, guildId) {
  const timer = await getTimer(guildId);
  await clearTimer(guildId).catch(() => {});
  try {
    const { getManager, cancelLeave } = require('./lavalink');
    const player = getManager()?.getPlayer(guildId);
    if (player) {
      player.queue.tracks.splice(0, player.queue.tracks.length);
      await player.stopPlaying(true).catch(() => {});
      if ((timer?.end_action || 'stop') === 'leave') {
        await player.destroy().catch(() => {});
      } else {
        try { cancelLeave(guildId); } catch {}
      }
    }
  } catch {}
  try {
    const channel = timer?.channel_id ? client.channels.cache.get(timer.channel_id) : null;
    await channel?.send?.('😴 **Sleep timer fired** — playback stopped. Sweet dreams.').catch(() => {});
  } catch {}
}

// Called from the Lavalink trackEnd hook. Returns true if it fired.
async function onTrackEnd(client, guildId, completedNormal) {
  const timer = await getTimer(guildId).catch(() => null);
  if (!timer || !completedNormal) return false;
  if (timer.mode === 'song') {
    await fireTimer(client, guildId);
    return true;
  }
  if (timer.mode === 'count') {
    const left = (timer.songs_left ?? 1) - 1;
    if (left <= 0) {
      await fireTimer(client, guildId);
      return true;
    }
    await pool.query('UPDATE sleep_timers SET songs_left = $2 WHERE guild_id = $1', [guildId, left]).catch(() => {});
  }
  return false;
}

// Sweep for due duration timers + restore point after restarts.
async function sweepTimers(client) {
  let rows = [];
  try {
    rows = await allTimers();
  } catch {
    return;
  }
  const now = Date.now();
  for (const t of rows) {
    try {
      if (t.mode === 'duration' && t.expires_at && new Date(t.expires_at).getTime() <= now) {
        await fireTimer(client, t.guild_id);
      }
    } catch {}
  }
}

function startSleepSweep(client) {
  setTimeout(() => sweepTimers(client).catch(() => {}), 30_000);
  setInterval(() => sweepTimers(client).catch(() => {}), 60 * 1000).unref?.();
}

module.exports = {
  initSleepTables, setTimer, getTimer, clearTimer, remainingText,
  fireTimer, onTrackEnd, sweepTimers, startSleepSweep,
};
