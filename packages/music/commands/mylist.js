const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserPlaylist, addToPlaylist, removeFromPlaylist } = require('../lib/playlistStore');
const { getOrCreatePlayer, searchTrack } = require('../lib/lavalink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mylist')
    .setDescription('Manage your personal saved playlist')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a song to your saved playlist')
        .addStringOption(opt =>
          opt.setName('song').setDescription('Song name or YouTube link').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('show')
        .setDescription('Show your saved playlist'))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a song from your saved playlist')
        .addIntegerOption(opt =>
          opt.setName('position').setDescription('Position number from /mylist show').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('play')
        .setDescription('Queue your entire saved playlist')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (sub === 'add') {
      await interaction.deferReply();
      const query = interaction.options.getString('song');
      const track = await searchTrack(query, interaction.user.tag);
      if (!track) return interaction.editReply('❌ Couldn\'t find that song.');

      addToPlaylist(userId, { title: track.info.title, url: track.info.uri, requestedBy: interaction.user.tag });
      return interaction.editReply(`✅ Added **${track.info.title}** to your saved playlist.`);
    }

    if (sub === 'show') {
      const list = getUserPlaylist(userId);
      if (list.length === 0) {
        return interaction.reply({ content: '📭 Your playlist is empty. Add songs with `/mylist add`.', ephemeral: true });
      }
      const text = list.map((s, i) => `${i + 1}. **${s.title}**`).join('\n');
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🎶 ${interaction.user.username}'s Playlist`)
        .setDescription(text.slice(0, 4000));
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'remove') {
      const position = interaction.options.getInteger('position');
      const removed = removeFromPlaylist(userId, position - 1);
      if (!removed) {
        return interaction.reply({ content: '❌ Invalid position. Check `/mylist show` for numbers.', ephemeral: true });
      }
      return interaction.reply(`🗑️ Removed song #${position} from your playlist.`);
    }

    if (sub === 'play') {
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        return interaction.reply({ content: '🚫 Join a voice channel first.', ephemeral: true });
      }
      const list = getUserPlaylist(userId);
      if (list.length === 0) {
        return interaction.reply({ content: '📭 Your playlist is empty.', ephemeral: true });
      }

      await interaction.deferReply();

      const player = getOrCreatePlayer(interaction);
      if (!player.connected) await player.connect();

      let added = 0;
      for (const song of list) {
        const track = await searchTrack(song.url, interaction.user.tag);
        if (track) {
          player.queue.add(track);
          added++;
        }
      }

      if (!player.playing && !player.paused && added > 0) {
        await player.play();
      }

      return interaction.editReply(`➕ Queued ${added} song(s) from your saved playlist.`);
    }
  },
};