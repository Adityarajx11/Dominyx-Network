const path = require('path');
// Load this bot's own .env first — cwd is the repo root when run via workspaces.
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
const { Client, GatewayIntentBits, MessageFlags, Events } = require('discord.js');

const { loadCommands, loadEvents } = require('@dominyx/core');
const { startAutoClose } = require('./lib/autoClose');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

loadCommands(client, path.join(__dirname, 'commands'));
loadEvents(client, path.join(__dirname, 'events'));

// Sweeper starts only after login: running it logged-out would see an empty
// guild cache and mismark tickets.
client.once(Events.ClientReady, () => startAutoClose(client));

client.on('interactionCreate', async (interaction) => {
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

client.login(process.env.BOT_TOKEN).catch((err) => {
  console.error('❌ Login failed (bad BOT_TOKEN?):', err.message);
  process.exit(1);
});
