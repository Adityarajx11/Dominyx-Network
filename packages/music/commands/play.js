const { SlashCommandBuilder } = require('discord.js');
const { getOrCreatePlayer, searchTrack } = require('../lib/lavalink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song by name or link, or add it to the queue')
    .addStringOption(opt =>
      opt.setName('song')
        .setDescription('Song name or YouTube link')
        .setRequired(true)),

  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: '🚫 Join a voice channel first.', ephemeral: true });
    }

    await interaction.deferReply();

    const query = interaction.options.getString('song');
    const track = await searchTrack(query, interaction.user.tag);

    if (!track) {
      return interaction.editReply('❌ Couldn\'t find that song.');
    }

    const player = getOrCreatePlayer(interaction);
    if (!player.connected) await player.connect();

    player.queue.add(track);

    if (!player.playing && !player.paused) {
      await player.play();
      return interaction.editReply(`🎶 Loading **${track.info.title}**...`);
    } else {
      return interaction.editReply(`➕ Added to queue: **${track.info.title}** (position ${player.queue.tracks.length})`);
    }
  },
};