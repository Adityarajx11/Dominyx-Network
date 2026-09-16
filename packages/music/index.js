require('dotenv').config();
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');

const { loadCommands, loadEvents } = require('@rook/core');
const { attachLavalink, getManager } = require('./lib/lavalink');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
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
      await command.execute(interaction, client);
    } catch (err) {
      console.error(`Error running /${interaction.commandName}:`, err);
      const errMsg = { content: '⚠️ Something went wrong running that command.', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(errMsg).catch(() => {});
      else await interaction.reply(errMsg).catch(() => {});
    }
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith('music_')) {
    const { handleMusicButton } = require('./lib/buttons');
    try {
      await handleMusicButton(interaction);
    } catch (err) {
      console.error('Music button error:', err);
      const errMsg = { content: '⚠️ Something went wrong with that button.', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(errMsg).catch(() => {});
      else await interaction.reply(errMsg).catch(() => {});
    }
  }
});

client.login(process.env.BOT_TOKEN);