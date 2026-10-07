const path = require('path');
// Load this bot's own .env first — cwd is the repo root when run via workspaces.
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
const { Client, GatewayIntentBits, MessageFlags } = require('discord.js');

const { loadCommands, loadEvents } = require('@dominyx/core');
const { attachLavalink, getManager, searchTrack, getOrCreatePlayer } = require('./lib/lavalink');
const { requireDj, getMusicSettings } = require('./lib/settings');

const DJ_GATED_COMMANDS = new Set(['play', 'pause', 'resume', 'skip', 'stop', 'loop', 'shuffle', 'volume', '247']);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

attachLavalink(client);

loadCommands(client, path.join(__dirname, 'commands'));
loadEvents(client, path.join(__dirname, 'events'));

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      if (DJ_GATED_COMMANDS.has(interaction.commandName)) {
        const allowed = await requireDj(interaction);
        if (!allowed) return;
      }
      await command.execute(interaction, client);
    } catch (err) {
      console.error(`Error running /${interaction.commandName}:`, err);
      const errMsg = { content: '⚠️ Something went wrong running that command.', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) await interaction.followUp(errMsg).catch(() => {});
      else await interaction.reply(errMsg).catch(() => {});
    }
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith('music_')) {
    const { handleMusicButton } = require('./lib/buttons');
    try {
      const allowed = await requireDj(interaction);
      if (!allowed) return;
      await handleMusicButton(interaction);
    } catch (err) {
      console.error('Music button error:', err);
      const errMsg = { content: '⚠️ Something went wrong with that button.', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) await interaction.followUp(errMsg).catch(() => {});
      else await interaction.reply(errMsg).catch(() => {});
    }
  }
});

client.login(process.env.BOT_TOKEN).catch((err) => {
  console.error('❌ Login failed (bad BOT_TOKEN?):', err.message);
  process.exit(1);
});
