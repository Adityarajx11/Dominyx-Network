require('dotenv').config();
const path = require('path');
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

  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('suggest:')) {
    try {
      const selectedUri = interaction.values[0];

      // Create a mock interaction for player setup
      const member = interaction.member ?? await interaction.guild.members.fetch(interaction.user.id);
      const settings = await getMusicSettings(interaction.guild.id);
      
      // Reuse existing player creation logic
      const player = getOrCreatePlayer(
        {
          member,
          guild: interaction.guild,
          channel: interaction.channel,
        },
        { volume: settings.defaultVolume }
      );
      if (!player.connected) await player.connect();

      // Search for the selected track by URI
      const node = getManager().nodeManager.leastUsedNodes()[0];
      if (!node) {
        return interaction.reply({
          content: '⚠️ Music server is not connected.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const res = await node.search({ query: selectedUri }, interaction.user.tag);
      if (!res || !res.tracks || res.tracks.length === 0) {
        return interaction.reply({
          content: '❌ Could not find that track.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const selectedTrack = res.tracks[0];
      player.queue.add(selectedTrack);

      // If not playing, start playback
      if (!player.playing && !player.paused) {
        await player.play();
      }

      await interaction.reply({
        content: `✅ Added **${selectedTrack.info.title}** to the queue.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      console.error('Song suggestion error:', err);
      const errMsg = { content: '⚠️ Something went wrong adding that song.', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) await interaction.followUp(errMsg).catch(() => {});
      else await interaction.reply(errMsg).catch(() => {});
    }
  }
});

client.login(process.env.BOT_TOKEN);
