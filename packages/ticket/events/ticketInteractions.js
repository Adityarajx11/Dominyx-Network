const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { getConfig, getOpenTicketCountForUser, createTicket, getTicketByChannel, claimTicket, setPriority, closeTicket, saveTranscript } = require('../lib/ticketStore');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      if (interaction.isChatInputCommand()) return;

      // Ticket creation select
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_create_select') {
        const guildId = interaction.guildId;
        const userId = interaction.user.id;
        const cfg = await getConfig(guildId);
        if (!cfg || !cfg.category_channel_id || !cfg.staff_role_id) {
          return interaction.reply({ content: '❌ Ticket system is not fully configured. Run /ticketsetup and set category and staff role.', flags: MessageFlags.Ephemeral });
        }

        const openCount = await getOpenTicketCountForUser(guildId, userId);
        const maxTickets = cfg.max_tickets_per_user || 1;
        if (openCount >= maxTickets) {
          return interaction.reply({ content: `❌ You already have ${openCount} open ticket(s) (limit ${maxTickets}). Close one before creating another.`, flags: MessageFlags.Ephemeral });
        }

        const selectedIndex = parseInt(interaction.values[0], 10);
        const category = Array.isArray(cfg.categories) ? cfg.categories[selectedIndex] : null;
        if (!category) {
          return interaction.reply({ content: '❌ Invalid ticket category selected.', flags: MessageFlags.Ephemeral });
        }

        const username = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
        const channelName = `ticket-${username}`.slice(0, 90);

        const guild = await client.guilds.fetch(guildId);
        const categoryChannel = await guild.channels.fetch(cfg.category_channel_id).catch(() => null);
        if (!categoryChannel) return interaction.reply({ content: '❌ Configured category channel not found. Update your config.', flags: MessageFlags.Ephemeral });

        const everyoneRole = guild.roles.everyone;
        const staffRole = cfg.staff_role_id ? await guild.roles.fetch(cfg.staff_role_id).catch(() => null) : null;

        const newChannel = await guild.channels.create({
          name: channelName,
          type: 0,
          parent: categoryChannel.id,
          permissionOverwrites: [
            { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: userId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            ...(staffRole ? [{ id: staffRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }] : []),
            { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] },
          ],
        });

        const ticket = await createTicket(guildId, newChannel.id, userId, category.label);

        const embed = new EmbedBuilder()
          .setColor(0xDC143C)
          .setTitle(`🎫 Ticket #${ticket.id}`)
          .addFields(
            { name: 'Creator', value: `<@${userId}>`, inline: true },
            { name: 'Category', value: category.label || 'Unknown', inline: true },
            { name: 'Priority', value: 'Medium', inline: true },
            { name: 'Status', value: 'Open', inline: true },
            { name: 'Claimed By', value: 'None', inline: true },
          )
          .setTimestamp();

        const claimButton = new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Primary);
        const closeButton = new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger);

        const prioritySelect = new StringSelectMenuBuilder()
          .setCustomId('ticket_priority_select')
          .setPlaceholder('Set priority')
          .addOptions([
            { label: 'Low', value: 'Low' },
            { label: 'Medium', value: 'Medium' },
            { label: 'High', value: 'High' },
            { label: 'Urgent', value: 'Urgent' },
          ]);

        const row1 = new ActionRowBuilder().addComponents(claimButton, closeButton);
        const row2 = new ActionRowBuilder().addComponents(prioritySelect);

        await newChannel.send({ embeds: [embed], components: [row1, row2] });
        return interaction.reply({ content: `✅ Created ticket ${newChannel}.`, flags: MessageFlags.Ephemeral });
      }

      // Claim
      if (interaction.isButton() && interaction.customId === 'ticket_claim') {
        const channel = interaction.channel;
        const guildId = interaction.guildId;
        const userId = interaction.user.id;
        const cfg = await getConfig(guildId);
        if (!cfg || !cfg.staff_role_id) return interaction.reply({ content: '❌ Ticket system not configured properly.', flags: MessageFlags.Ephemeral });

        const member = await interaction.guild.members.fetch(userId);
        if (!member.roles.cache.has(cfg.staff_role_id)) return interaction.reply({ content: '❌ You must have the staff role to claim tickets.', flags: MessageFlags.Ephemeral });

        const ticket = await getTicketByChannel(channel.id);
        if (!ticket) return interaction.reply({ content: '❌ No ticket found for this channel.', flags: MessageFlags.Ephemeral });

        await claimTicket(ticket.id, userId);

        const messages = await channel.messages.fetch({ limit: 50 });
        const firstEmbedMsg = messages.reverse().find(m => m.embeds && m.embeds.length);
        if (firstEmbedMsg) {
          const embed = firstEmbedMsg.embeds[0];
          const newEmbed = EmbedBuilder.from(embed).setFields(
            { name: 'Creator', value: `<@${ticket.user_id}>`, inline: true },
            { name: 'Category', value: ticket.category || 'Unknown', inline: true },
            { name: 'Priority', value: ticket.priority || 'Medium', inline: true },
            { name: 'Status', value: 'Claimed', inline: true },
            { name: 'Claimed By', value: `<@${userId}>`, inline: true },
          );
          await firstEmbedMsg.edit({ embeds: [newEmbed] }).catch(() => {});
        }
        return interaction.reply({ content: `✅ Ticket claimed by <@${userId}>.`, flags: MessageFlags.Ephemeral });
      }

      // Priority select
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_priority_select') {
        const channel = interaction.channel;
        const guildId = interaction.guildId;
        const userId = interaction.user.id;
        const cfg = await getConfig(guildId);
        if (!cfg || !cfg.staff_role_id) return interaction.reply({ content: '❌ Ticket system not configured properly.', flags: MessageFlags.Ephemeral });

        const member = await interaction.guild.members.fetch(userId);
        if (!member.roles.cache.has(cfg.staff_role_id)) return interaction.reply({ content: '❌ You must have the staff role to change priority.', flags: MessageFlags.Ephemeral });

        const ticket = await getTicketByChannel(channel.id);
        if (!ticket) return interaction.reply({ content: '❌ No ticket found for this channel.', flags: MessageFlags.Ephemeral });

        const selected = interaction.values[0];
        await setPriority(ticket.id, selected);

        const messages = await channel.messages.fetch({ limit: 50 });
        const firstEmbedMsg = messages.reverse().find(m => m.embeds && m.embeds.length);
        if (firstEmbedMsg) {
          const embed = firstEmbedMsg.embeds[0];
          const newEmbed = EmbedBuilder.from(embed).setFields(
            { name: 'Creator', value: `<@${ticket.user_id}>`, inline: true },
            { name: 'Category', value: ticket.category || 'Unknown', inline: true },
            { name: 'Priority', value: selected || 'Medium', inline: true },
            { name: 'Status', value: ticket.status || 'Open', inline: true },
            { name: 'Claimed By', value: ticket.claimed_by ? `<@${ticket.claimed_by}>` : 'None', inline: true },
          );
          await firstEmbedMsg.edit({ embeds: [newEmbed] }).catch(() => {});
        }
        return interaction.reply({ content: `✅ Priority set to **${selected}**.`, flags: MessageFlags.Ephemeral });
      }

      // Close
      if (interaction.isButton() && interaction.customId === 'ticket_close') {
        const channel = interaction.channel;
        const guildId = interaction.guildId;
        const userId = interaction.user.id;
        const cfg = await getConfig(guildId);
        if (!cfg || !cfg.staff_role_id) return interaction.reply({ content: '❌ Ticket system not configured properly.', flags: MessageFlags.Ephemeral });

        const member = await interaction.guild.members.fetch(userId);
        const ticket = await getTicketByChannel(channel.id);
        if (!ticket) return interaction.reply({ content: '❌ No ticket found for this channel.', flags: MessageFlags.Ephemeral });

        const isStaff = member.roles.cache.has(cfg.staff_role_id);
        const isCreator = ticket.user_id === userId;
        if (!isStaff && !isCreator) return interaction.reply({ content: '❌ Only staff or the ticket creator can close this ticket.', flags: MessageFlags.Ephemeral });

        const fetched = await channel.messages.fetch({ limit: 100 });
        const msgs = Array.from(fetched.values()).reverse();
        const lines = msgs.map(m => `${new Date(m.createdTimestamp).toISOString()} | ${m.author.tag}: ${m.content.replace(/\n/g, ' ')}`);
        const transcript = lines.join('\n');

        await saveTranscript(ticket.id, transcript);
        await closeTicket(ticket.id);

        if (cfg.log_channel_id) {
          const logChannel = await interaction.guild.channels.fetch(cfg.log_channel_id).catch(() => null);
          if (logChannel) {
            const attachment = { attachment: Buffer.from(transcript, 'utf-8'), name: `ticket-${ticket.id}-transcript.txt` };
            const logEmbed = new EmbedBuilder()
              .setColor(0xDC143C)
              .setTitle('Ticket Closed')
              .addFields(
                { name: 'Ticket', value: `#${ticket.id} - <#${channel.id}>`, inline: true },
                { name: 'Creator', value: `<@${ticket.user_id}>`, inline: true },
                { name: 'Closed By', value: `<@${userId}>`, inline: true },
              )
              .setTimestamp();
            await logChannel.send({ embeds: [logEmbed], files: [attachment] }).catch(() => {});
          }
        }

        await interaction.reply({ content: '🗑️ Ticket will be deleted in 5 seconds...', flags: MessageFlags.Ephemeral });
        setTimeout(() => { channel.delete().catch(() => {}); }, 5000);
        return;
      }
    } catch (err) {
      console.error('Ticket interaction error:', err);
      const errMsg = { content: '⚠️ Something went wrong handling that ticket interaction.', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) await interaction.followUp(errMsg).catch(() => {});
      else await interaction.reply(errMsg).catch(() => {});
    }
  },
};
