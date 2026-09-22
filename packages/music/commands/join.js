const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getManager, getOrCreatePlayer, cancelLeave } = require('../lib/lavalink');
const { requireDj, getMusicSettings } = require('../lib/settings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Make the bot join your voice channel'),

  async execute(interaction) {
    if (!(await requireDj(interaction))) return;

    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: '🚫 Join a voice channel first.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();

    const manager = getManager();
    let player = manager.getPlayer(interaction.guild.id);

    if (player && player.voiceChannelId === voiceChannel.id && player.connected) {
      return interaction.editReply(`🎧 Already in <#${voiceChannel.id}>.`);
    }

    if (!player) {
      const settings = await getMusicSettings(interaction.guild.id);
      player = getOrCreatePlayer(interaction, { volume: settings.defaultVolume });
    } else {
      player.voiceChannelId = voiceChannel.id;
      player.textChannelId = interaction.channel.id;
    }

    cancelLeave(interaction.guild.id);
    if (!player.connected) await player.connect();
    return interaction.editReply(`🎧 Joined <#${voiceChannel.id}>. Use \`/play\` to start the music.`);
  },
};
