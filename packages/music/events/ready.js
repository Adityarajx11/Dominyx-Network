const { initDatabase } = require('@dominyx/core');
const { initManager } = require('../lib/lavalink');
const { initMusicSettings } = require('../lib/settings');
const { initHistoryTables } = require('../lib/history');
const { initXpTables } = require('../lib/musicXp');
const { initSleepTables, startSleepSweep } = require('../lib/sleepTimer');
const { initRadioTables } = require('../lib/radio');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    try {
      await initDatabase();
      await initMusicSettings();
      await initHistoryTables();
      await initXpTables();
      await initSleepTables();
      await initRadioTables();
      startSleepSweep(client);
    } catch (err) {
      console.error('⚠️ DB init failed (music will still work, 24/7 mode won\'t persist):', err.message);
    }
    initManager(client);
  },
};