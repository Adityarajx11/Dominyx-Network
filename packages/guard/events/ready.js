const { initGuardTables } = require('../lib/guardStore');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    try {
      await initGuardTables();
    } catch (err) {
      console.error('⚠️ DB init failed:', err.message);
    }
  },
};