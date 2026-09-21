require('dotenv').config();
const path = require('path');
const { Client, GatewayIntentBits, MessageFlags } = require('discord.js');

const { loadCommands, loadEvents } = require('@dominyx/core');
const { handleSelfRoleSelect } = require('./lib/selfRoleMenu');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

loadCommands(client, path.join(__dirname, 'commands'));
loadEvents(client, path.join(__dirname, 'events'));

client.on('interactionCreate', async (interaction) => {
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId.startsWith('selfrole')) {
      return handleSelfRoleSelect(interaction);
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (err) {
    console.error(`Error running /${interaction.commandName}:`, err);
    const errMsg = { content: '⚠️ Something went wrong running that command.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) await interaction.followUp(errMsg).catch(() => {});
    else await interaction.reply(errMsg).catch(() => {});
  }
});

client.login(process.env.BOT_TOKEN);
