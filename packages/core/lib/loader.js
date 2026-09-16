const fs = require('fs');
const path = require('path');

function loadCommands(client, commandsDir) {
  client.commands = new (require('discord.js').Collection)();
  if (!fs.existsSync(commandsDir)) return;
  const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const command = require(path.join(commandsDir, file));
    if (command?.data?.name) client.commands.set(command.data.name, command);
  }
  console.log(`📦 Loaded ${client.commands.size} command(s).`);
}

function loadEvents(client, eventsDir) {
  if (!fs.existsSync(eventsDir)) return;
  const files = fs.readdirSync(eventsDir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const event = require(path.join(eventsDir, file));
    const handler = (...args) => event.execute(...args, client);
    if (event.once) client.once(event.name, handler);
    else client.on(event.name, handler);
  }
  console.log(`👂 Loaded ${files.length} event listener(s).`);
}

module.exports = { loadCommands, loadEvents };
