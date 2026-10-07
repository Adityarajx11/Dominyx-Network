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
    throw new Error('BOT_TOKEN or CLIENT_ID not set — refusing to fake a deploy. Check the bot .env.');
  }

  const rest = new REST({ version: '10' }).setToken(token);

  if (process.env.GUILD_ID) {
    // Dev deploy: instant in one server.
    console.log(`Deploying ${commands.length} slash command(s) to guild ${process.env.GUILD_ID}...`);
    await rest.put(Routes.applicationGuildCommands(clientId, process.env.GUILD_ID), { body: commands });
    console.log('✅ Guild commands deployed.');
    return;
  }

  console.log(`Deploying ${commands.length} slash command(s)...`);
  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  console.log('✅ Global commands deployed.');
}

module.exports = { deployCommands };
