const { initGreetSettings } = require('../lib/settings');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    try {
      await initGreetSettings();
    } catch (err) {
      console.error('⚠️ DB init failed:', err.message);
    }
  },
};