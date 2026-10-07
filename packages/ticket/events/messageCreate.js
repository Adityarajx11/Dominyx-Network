const { getTicketByChannel, touchTicketActivity } = require('../lib/ticketStore');

// Cache of open ticket channels so ordinary chat costs zero DB reads.
// Invalidated on close (ticketInteractions) and refreshed on miss.
const openChannels = new Set();
let cacheReady = false;

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    try {
      if (message.author.bot || !message.guild) return;
      if (cacheReady && !openChannels.has(message.channel.id)) return;
      const ticket = await getTicketByChannel(message.channel.id);
      if (!ticket || !['open', 'claimed'].includes(ticket.status)) {
        openChannels.delete(message.channel.id);
        cacheReady = true;
        return;
      }
      openChannels.add(message.channel.id);
      cacheReady = true;
      await touchTicketActivity(ticket.id);
    } catch {}
  },
};

module.exports._openChannels = openChannels;
