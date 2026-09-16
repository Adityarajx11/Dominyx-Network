require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

async function deployCommands(commandsDir) {
  if (!fs.existsSync(commandsDir)) {
    console.log('No commands directory — skipping deployment.');
    return;
  }

  const commands = [];
  const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));

  for (const file of files) {
    try {
      const command = require(path.join(commandsDir, file));
      if (command?.data && typeof command.data.toJSON === 'function') {
        commands.push(command.data.toJSON());
      }
    } catch (err) {
      console.warn(`Failed to load ${file}:`, err?.message || err);
    }
  }

  if (commands.length === 0) {
    console.log('No valid commands — nothing to deploy.');
    return;
  }

  const token = process.env.BOT_TOKEN;
  const clientId = process.env.CLIENT_ID;
  if (!token || !clientId) {
    console.log('BOT_TOKEN or CLIENT_ID not set — skipping deployment.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);

  console.log(`Deploying ${commands.length} slash command(s)...`);
  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  console.log('✅ Global commands deployed.');

  if (process.env.GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(clientId, process.env.GUILD_ID), { body: [] });
    console.log('🧹 Cleared guild-specific commands.');
  }
}

module.exports = { deployCommands };
