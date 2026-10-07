// Personal playlists. Postgres is primary (Railway disk is wiped on restart);
// the JSON file is a local-dev fallback when the DB is unreachable.
const fs = require('fs');
const path = require('path');
const { pool } = require('@dominyx/core');

const DATA_FILE = path.join(__dirname, '..', 'data', 'playlists.json');
const MAX_SONGS = 100;

function loadAll() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveAll(data) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to save playlists:', err.message);
  }
}

async function dbGet(userId) {
  const res = await pool.query('SELECT songs FROM user_playlists WHERE user_id = $1', [userId]);
  const songs = res.rows[0]?.songs;
  return Array.isArray(songs) ? songs : null;
}

async function dbSet(userId, songs) {
  await pool.query(
    `INSERT INTO user_playlists (user_id, songs, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id) DO UPDATE SET songs = $2::jsonb, updated_at = NOW()`,
    [userId, JSON.stringify(songs)]
  );
}

async function getUserPlaylist(userId) {
  try {
    const songs = await dbGet(userId);
    if (songs) return songs;
  } catch {}
  return loadAll()[userId] || [];
}

async function addToPlaylist(userId, song) {
  let songs = [];
  try {
    songs = (await dbGet(userId)) || [];
  } catch {
    const all = loadAll();
    songs = all[userId] || [];
    if (songs.length >= MAX_SONGS) return -1;
    songs.push(song);
    saveAll({ ...all, [userId]: songs });
    return songs.length;
  }
  if (songs.length >= MAX_SONGS) return -1;
  songs.push(song);
  try {
    await dbSet(userId, songs);
  } catch {
    const all = loadAll();
    saveAll({ ...all, [userId]: songs });
  }
  return songs.length;
}

async function removeFromPlaylist(userId, index) {
  let songs = [];
  let useDb = true;
  try {
    songs = (await dbGet(userId)) || [];
  } catch {
    useDb = false;
    songs = loadAll()[userId] || [];
  }
  if (!songs[index]) return false;
  songs.splice(index, 1);
  try {
    if (useDb) await dbSet(userId, songs);
    else {
      const all = loadAll();
      saveAll({ ...all, [userId]: songs });
    }
  } catch {
    return false;
  }
  return true;
}

module.exports = { getUserPlaylist, addToPlaylist, removeFromPlaylist, MAX_SONGS };
