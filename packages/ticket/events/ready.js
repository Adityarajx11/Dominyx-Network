const { initTicketTables } = require('../lib/ticketStore');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    try {
      await initTicketTables();
    } catch (err) {
      console.error('⚠️ DB init failed:', err.message);
    }
  },
};