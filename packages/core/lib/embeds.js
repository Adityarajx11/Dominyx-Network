const { EmbedBuilder } = require('discord.js');

function success(message) {
  return new EmbedBuilder().setColor(0x57F287).setDescription(String(message ?? ''));
}

function error(message) {
  return new EmbedBuilder().setColor(0xED4245).setDescription(String(message ?? ''));
}

function info(message) {
  return new EmbedBuilder().setColor(0x5865F2).setDescription(String(message ?? ''));
}

module.exports = { success, error, info };
