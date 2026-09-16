const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'playlists.json');

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

function getUserPlaylist(userId) {
  const all = loadAll();
  return all[userId] || [];
}

function addToPlaylist(userId, song) {
  const all = loadAll();
  if (!all[userId]) all[userId] = [];
  all[userId].push(song);
  saveAll(all);
}

function removeFromPlaylist(userId, index) {
  const all = loadAll();
  if (!all[userId] || !all[userId][index]) return false;
  all[userId].splice(index, 1);
  saveAll(all);
  return true;
}

module.exports = { getUserPlaylist, addToPlaylist, removeFromPlaylist };