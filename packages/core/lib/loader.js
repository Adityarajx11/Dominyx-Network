const fs = require('fs');
const path = require('path');

function loadCommands(client, commandsDir) {
  client.commands = new (require('discord.js').Collection)();
  if (!fs.existsSync(commandsDir)) return;
  const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    let command;
    try {
      command = require(path.join(commandsDir, file));
    } catch (err) {
      console.warn(`Skipping command ${file}: failed to load (${err.message})`);
      continue;
    }
    if (!command?.data?.name || typeof command.execute !== 'function') {
      console.warn(`Skipping command ${file}: must export { data, execute }.`);
      continue;
    }
    client.commands.set(command.data.name, command);
  }
  console.log(`📦 Loaded ${client.commands.size} command(s).`);
}

function loadEvents(client, eventsDir) {
  if (!fs.existsSync(eventsDir)) return;
  const files = fs.readdirSync(eventsDir).filter(f => f.endsWith('.js'));
  let loaded = 0;
  for (const file of files) {
    let event;
    try {
      event = require(path.join(eventsDir, file));
    } catch (err) {
      console.warn(`Skipping event ${file}: failed to load (${err.message})`);
      continue;
    }
    if (!event?.name || typeof event.execute !== 'function') {
      console.warn(`Skipping event ${file}: must export { name, execute }.`);
      continue;
    }
    const handler = (...args) => event.execute(...args, client);
    if (event.once) client.once(event.name, handler);
    else client.on(event.name, handler);
    loaded++;
  }
  console.log(`👂 Loaded ${loaded} event listener(s).`);
}

module.exports = { loadCommands, loadEvents };
