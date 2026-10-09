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
  if (interaction.isAutocomplete()) {
    if (interaction.commandName === 'radio') {
      try {
        const { autocompleteArtists } = require('./commands/radio');
        const focused = interaction.options.getFocused();
        await interaction.respond(await autocompleteArtists(focused));
      } catch {}
    }
    return;
  }

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
      // Suggest is read-only: everyone may open it.
      if (interaction.customId !== 'music_suggest') {
        const allowed = await requireDj(interaction);
        if (!allowed) return;
      }
      await handleMusicButton(interaction);
    } catch (err) {
      console.error('Music button error:', err);
      const errMsg = { content: '⚠️ Something went wrong with that button.', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) await interaction.followUp(errMsg).catch(() => {});
      else await interaction.reply(errMsg).catch(() => {});
    }
    return;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'suggest_pick') {
    const { handleSuggestMenu } = require('./lib/suggestMenu');
    try {
      await handleSuggestMenu(interaction);
    } catch (err) {
      console.error('Suggest menu error:', err);
      const errMsg = { content: '⚠️ Something went wrong with that pick.', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) await interaction.followUp(errMsg).catch(() => {});
      else await interaction.reply(errMsg).catch(() => {});
    }
    return;
  }

  if (interaction.isButton() && interaction.customId === 'suggest_mode') {
    const { handleSuggestMode } = require('./lib/suggestMenu');
    try {
      await handleSuggestMode(interaction);
    } catch (err) {
      console.error('Suggest mode error:', err);
    }
    return;
  }

  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('mood_pick:')) {
    const { handleMoodPick } = require('./commands/recommend');
    try {
      await handleMoodPick(interaction);
    } catch (err) {
      console.error('Mood pick error:', err);
      const errMsg = { content: '⚠️ Something went wrong with that pick.', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) await interaction.followUp(errMsg).catch(() => {});
      else await interaction.reply(errMsg).catch(() => {});
    }
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith('radio_')) {
    const { handleRadioButton } = require('./commands/radio');
    try {
      await handleRadioButton(interaction);
    } catch (err) {
      console.error('Radio button error:', err);
      const errMsg = { content: '⚠️ Radio hiccup — try again.', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) await interaction.followUp(errMsg).catch(() => {});
      else await interaction.reply(errMsg).catch(() => {});
    }
    return;
  }
  if (interaction.isButton() && (interaction.customId.startsWith('mood_play:') || interaction.customId.startsWith('mood_add:') || interaction.customId.startsWith('mood_refresh:'))) {
    const { handleMoodButton } = require('./commands/recommend');
    try {
      await handleMoodButton(interaction, client);
    } catch (err) {
      console.error('Mood button error:', err);
      const errMsg = { content: '⚠️ Something went wrong.', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) await interaction.followUp(errMsg).catch(() => {});
      else await interaction.reply(errMsg).catch(() => {});
    }
    return;
  }
});

client.login(process.env.BOT_TOKEN).catch((err) => {
  console.error('❌ Login failed (bad BOT_TOKEN?):', err.message);
  process.exit(1);
});
