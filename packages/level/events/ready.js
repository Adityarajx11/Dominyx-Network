const { initLevelDatabase } = require('../lib/db');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    try {
      await initLevelDatabase();
    } catch (err) {
      console.error('⚠️ DB init failed:', err.message);
    }
  },
};