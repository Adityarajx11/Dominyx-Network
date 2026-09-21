const { EmbedBuilder } = require('discord.js');
const { findStaleTickets, closeTicket } = require('./ticketStore');

async function sweepOnce(client) {
  let stale = [];
  try {
    stale = await findStaleTickets();
  } catch (err) {
    console.error('Ticket auto-close lookup failed:', err.message);
    return;
  }
  if (stale.length === 0) return;

  for (const ticket of stale) {
    try {
      const guild = client.guilds.cache.get(ticket.guild_id);
      if (!guild) { await closeTicket(ticket.id).catch(() => {}); continue; }
      const channel = await guild.channels.fetch(ticket.channel_id).catch(() => null);

      await closeTicket(ticket.id);

      if (ticket.dm_close) {
        const user = await client.users.fetch(ticket.user_id).catch(() => null);
        if (user) {
          await user.send(
            `🗑️ Your ticket in **${guild.name}** was closed after ${ticket.inactive_close_hours} hour(s) of inactivity. Open a new one if you still need help.`
          ).catch(() => {});
        }
      }

      if (ticket.log_channel_id && channel) {
        const logChannel = await guild.channels.fetch(ticket.log_channel_id).catch(() => null);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setColor(0xDC143C)
            .setTitle('Ticket Auto-Closed (inactive)')
            .addFields(
              { name: 'Ticket', value: `#${ticket.id}`, inline: true },
              { name: 'Creator', value: `<@${ticket.user_id}>`, inline: true },
              { name: 'Idle', value: `${ticket.inactive_close_hours}h`, inline: true },
            )
            .setTimestamp();
          await logChannel.send({ embeds: [embed] }).catch(() => {});
        }
      }

      if (channel) {
        await channel.send('🗑️ Closing due to inactivity…').catch(() => {});
        setTimeout(() => channel.delete().catch(() => {}), 5000);
      }
    } catch (err) {
      console.error(`Ticket auto-close failed for #${ticket.id}:`, err.message);
    }
  }
}

function startAutoClose(client) {
  console.log('🎫 Ticket auto-close sweeper ready (every 15 min).');
  setTimeout(() => sweepOnce(client), 60_000);
  setInterval(() => sweepOnce(client), 15 * 60 * 1000);
}

module.exports = { startAutoClose };
