const { initPingSettings } = require('../lib/pingStore');
const { startLivePolling } = require('../lib/youtubeLive');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    try {
      await initPingSettings();
    } catch (err) {
      console.error('⚠️ DB init failed:', err.message);
    }
    startLivePolling(client);
  },
};