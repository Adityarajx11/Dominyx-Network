const { pool } = require('@dominyx/core');

const DAY_CAP = 100;
const cooldowns = new Map(); // `${guildId}:${userId}` -> last XP timestamp
const dayEarned = new Map(); // `${guildId}:${userId}:${YYYY-MM-DD}` -> xp today

async function initXpTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS music_user_stats (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      lifetime_xp INTEGER DEFAULT 0,
      season_xp INTEGER DEFAULT 0,
      season TEXT DEFAULT '',
      songs_requested INTEGER DEFAULT 0,
      artists JSONB DEFAULT '[]'::jsonb,
      last_request_at TIMESTAMPTZ,
      PRIMARY KEY (guild_id, user_id)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS music_reward_tiers (
      guild_id TEXT NOT NULL,
      threshold INTEGER NOT NULL,
      role_id TEXT NOT NULL,
      PRIMARY KEY (guild_id, threshold)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS music_seasons (
      guild_id TEXT PRIMARY KEY,
      current_season TEXT,
      rolled_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('🎵 Music XP tables ready.');
}

function currentSeason() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function getXpSettings(guildId) {
  try {
    const res = await pool.query(
      'SELECT xp_enabled, xp_cooldown_sec FROM music_settings WHERE guild_id = $1',
      [guildId]
    );
    const row = res.rows[0] || {};
    return {
      enabled: row.xp_enabled ?? true,
      cooldownSec: Number.isInteger(row.xp_cooldown_sec) ? row.xp_cooldown_sec : 300,
    };
  } catch {
    return { enabled: true, cooldownSec: 300 };
  }
}

// Awards XP for a started track. Returns { xp, newArtist } awarded (0s when gated).
async function awardTrackXp(guildId, userId, artist) {
  if (!userId || userId === 'unknown') return { xp: 0, newArtist: false };
  const { enabled, cooldownSec } = await getXpSettings(guildId);
  if (!enabled) return { xp: 0, newArtist: false };

  const now = Date.now();
  const ck = `${guildId}:${userId}`;
  if (now - (cooldowns.get(ck) || 0) < cooldownSec * 1000) return { xp: 0, newArtist: false };
  cooldowns.set(ck, now);
  if (cooldowns.size > 5000) {
    const oldest = cooldowns.keys().next().value;
    cooldowns.delete(oldest);
  }

  const dk = `${ck}:${dayKey()}`;
  const today = dayEarned.get(dk) || 0;
  if (today >= DAY_CAP) return { xp: 0, newArtist: false };

  const season = currentSeason();
  const cur = await pool.query(
    'SELECT * FROM music_user_stats WHERE guild_id = $1 AND user_id = $2',
    [guildId, userId]
  );
  let row = cur.rows[0];
  if (!row || row.season !== season) {
    await pool.query(
      `INSERT INTO music_user_stats (guild_id, user_id, lifetime_xp, season_xp, season, songs_requested, artists, last_request_at)
       VALUES ($1, $2, 0, 0, $3, 0, '[]'::jsonb, NOW())
       ON CONFLICT (guild_id, user_id) DO UPDATE SET season_xp = 0, season = $3`,
      [guildId, userId, season]
    );
    await pool.query(
      `INSERT INTO music_seasons (guild_id, current_season, rolled_at) VALUES ($1, $2, NOW())
       ON CONFLICT (guild_id) DO UPDATE SET current_season = $2, rolled_at = NOW()`,
      [guildId, season]
    );
    const fresh = await pool.query(
      'SELECT * FROM music_user_stats WHERE guild_id = $1 AND user_id = $2',
      [guildId, userId]
    );
    row = fresh.rows[0];
  }

  const seen = Array.isArray(row.artists) ? row.artists : [];
  const normArtist = String(artist || 'Unknown').slice(0, 200);
  const isNew = !seen.map((a) => String(a).toLowerCase()).includes(normArtist.toLowerCase());

  let gain = 10 + (isNew ? 5 : 0);
  const room = DAY_CAP - today;
  gain = Math.min(gain, Math.max(room, 0));
  if (gain <= 0) return { xp: 0, newArtist: false };
  dayEarned.set(dk, today + gain);

  const artists = isNew ? [...seen, normArtist].slice(-200) : seen;
  await pool.query(
    `UPDATE music_user_stats
     SET lifetime_xp = lifetime_xp + $3, season_xp = season_xp + $3,
         songs_requested = songs_requested + 1, artists = $4, last_request_at = NOW()
     WHERE guild_id = $1 AND user_id = $2`,
    [guildId, userId, gain, JSON.stringify(artists)]
  );
  return { xp: gain, newArtist: isNew };
}

async function getBoard(guildId, period = 'all', limit = 10) {
  if (period === 'season' || period === 'monthly') {
    const res = await pool.query(
      `SELECT user_id, season_xp AS xp, songs_requested FROM music_user_stats
       WHERE guild_id = $1 AND season = $2 ORDER BY season_xp DESC LIMIT $3`,
      [guildId, currentSeason(), limit]
    );
    return res.rows;
  }
  const res = await pool.query(
    `SELECT user_id, lifetime_xp AS xp, songs_requested FROM music_user_stats
     WHERE guild_id = $1 ORDER BY lifetime_xp DESC LIMIT $2`,
    [guildId, limit]
  );
  return res.rows;
}

async function setTier(guildId, threshold, roleId) {
  await pool.query(
    `INSERT INTO music_reward_tiers (guild_id, threshold, role_id) VALUES ($1, $2, $3)
     ON CONFLICT (guild_id, threshold) DO UPDATE SET role_id = $3`,
    [guildId, threshold, roleId]
  );
}

async function removeTier(guildId, threshold) {
  await pool.query('DELETE FROM music_reward_tiers WHERE guild_id = $1 AND threshold = $2', [guildId, threshold]);
}

async function getTiers(guildId) {
  const res = await pool.query('SELECT * FROM music_reward_tiers WHERE guild_id = $1 ORDER BY threshold ASC', [guildId]);
  return res.rows;
}

async function getSeasonXp(guildId, userId) {
  const res = await pool.query(
    'SELECT season_xp FROM music_user_stats WHERE guild_id = $1 AND user_id = $2',
    [guildId, userId]
  );
  return res.rows[0]?.season_xp || 0;
}

// Auto-assign the highest earned tier role; strip lower tier roles.
async function syncTierRole(client, guildId, userId) {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;
    const me = guild.members.me;
    if (!me?.permissions?.has?.('ManageRoles')) return;
    const tiers = await getTiers(guildId);
    if (tiers.length === 0) return;
    const xp = await getSeasonXp(guildId, userId);
    const earned = tiers.filter((t) => xp >= t.threshold).sort((a, b) => b.threshold - a.threshold);
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;
    const tierIds = tiers.map((t) => t.role_id);
    for (const t of tiers) {
      const has = member.roles.cache.has(t.role_id);
      const should = earned[0] && t.role_id === earned[0].role_id;
      if (should && !has) {
        const role = guild.roles.cache.get(t.role_id);
        if (role && me.roles.highest.position > role.position) {
          await member.roles.add(role, `Dominyx music XP tier ${t.threshold}`).catch(() => {});
        }
      } else if (!should && has && tierIds.includes(t.role_id)) {
        await member.roles.remove(t.role_id, 'Dominyx music XP tier change').catch(() => {});
      }
    }
  } catch {}
}

async function resetSeason(guildId) {
  await pool.query('UPDATE music_user_stats SET season_xp = 0 WHERE guild_id = $1', [guildId]);
  await pool.query(
    `INSERT INTO music_seasons (guild_id, current_season, rolled_at) VALUES ($1, $2, NOW())
     ON CONFLICT (guild_id) DO UPDATE SET current_season = $2, rolled_at = NOW()`,
    [guildId, currentSeason()]
  );
}

module.exports = {
  initXpTables, awardTrackXp, getBoard, setTier, removeTier, getTiers,
  syncTierRole, resetSeason, getSeasonXp, currentSeason, DAY_CAP,
};
