const { EmbedBuilder } = require('discord.js');

function success(message) {
  return new EmbedBuilder().setColor(0x57F287).setDescription(message);
}

function error(message) {
  return new EmbedBuilder().setColor(0xED4245).setDescription(message);
}

function info(message) {
  return new EmbedBuilder().setColor(0x5865F2).setDescription(message);
}

module.exports = { success, error, info };
