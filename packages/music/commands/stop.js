const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getManager } = require('../lib/lavalink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback and clear the queue'),

  async execute(interaction) {
    try {
      let player;
      try {
        player = getManager()?.getPlayer(interaction.guild.id);
      } catch {
        player = null;
      }
      if (!player) {
        return interaction.reply({ content: '🚫 Nothing is playing.', flags: MessageFlags.Ephemeral });
      }
      player.queue.tracks.splice(0, player.queue.tracks.length);
      await player.stopPlaying(true);
      // stopPlaying() leaves stale flags + the dead track behind —
      // reset so the next /play starts instead of queuing.
      try {
        player.playing = false;
        player.paused = false;
        player.queue.current = null;
      } catch {}
      return interaction.reply('⏹️ Stopped and cleared the queue.');
    } catch (err) {
      console.error(`Error running /stop:`, err);
      const errMsg = { content: '⚠️ Something went wrong stopping playback.', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) await interaction.followUp(errMsg).catch(() => {});
      else await interaction.reply(errMsg).catch(() => {});
    }
  },
};
