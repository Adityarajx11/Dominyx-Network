const { initDatabase } = require('@rook/core');
const { initManager } = require('../lib/lavalink');
const { initMusicSettings } = require('../lib/settings');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    try {
      await initDatabase();
      await initMusicSettings();
    } catch (err) {
      console.error('⚠️ DB init failed (music will still work, 24/7 mode won\'t persist):', err.message);
    }
    initManager(client);
  },
};