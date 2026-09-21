const { getTicketByChannel, touchTicketActivity } = require('../lib/ticketStore');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    try {
      if (message.author.bot || !message.guild) return;
      const ticket = await getTicketByChannel(message.channel.id);
      if (!ticket || !['open', 'claimed'].includes(ticket.status)) return;
      await touchTicketActivity(ticket.id);
    } catch {}
  },
};
