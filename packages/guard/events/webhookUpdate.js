const { alertModlog } = require('../lib/antinuke');

module.exports = {
  name: 'webhookUpdate',
  async execute(channel, client) {
    try {
      const guild = channel.guild;
      if (!guild || !channel) return;
      await alertModlog(
        client,
        guild.id,
        'Webhook changed',
        `A webhook was created or updated in **#${channel.name || channel.id}**. Token loggers arrive as webhooks — delete it if you didn't add it.`
      );
    } catch (err) {
      console.error('Antinuke webhook error:', err.message);
    }
  },
};
