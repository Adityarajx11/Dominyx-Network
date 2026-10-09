const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getUserPlaylist, addToPlaylist, removeFromPlaylist, MAX_SONGS } = require('../lib/playlistStore');
const { getOrCreatePlayer, searchTrack } = require('../lib/lavalink');
const { getMusicSettings } = require('../lib/settings');

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
      let result;
      try {
        result = await searchTrack(query, interaction.user.tag, interaction.user.id);
      } catch (err) {
        return interaction.editReply('🔌 Music server is unreachable — try again in a bit.');
      }
      if (!result) return interaction.editReply('❌ Couldn\'t find that song.');
      const track = result.track;

      const count = await addToPlaylist(userId, { title: track.info.title, url: track.info.uri, requestedBy: interaction.user.tag });
      if (count === -1) return interaction.editReply(`🚫 Playlist full (max ${MAX_SONGS} songs). Remove one with \`/mylist remove\`.`);
      return interaction.editReply(`✅ Added **${track.info.title}** to your saved playlist (#${count}).`);
    }

    if (sub === 'show') {
      const list = await getUserPlaylist(userId);
      if (list.length === 0) {
        return interaction.reply({ content: '📭 Your playlist is empty. Add songs with `/mylist add`.', flags: MessageFlags.Ephemeral });
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
      const removed = await removeFromPlaylist(userId, position - 1);
      if (!removed) {
        return interaction.reply({ content: '❌ Invalid position. Check `/mylist show` for numbers.', flags: MessageFlags.Ephemeral });
      }
      return interaction.reply(`🗑️ Removed song #${position} from your playlist.`);
    }

    if (sub === 'play') {
      const voiceChannel = interaction.member?.voice?.channel;
      if (!voiceChannel) {
        return interaction.reply({ content: '🚫 Join a voice channel first.', flags: MessageFlags.Ephemeral });
      }
      const list = await getUserPlaylist(userId);
      if (list.length === 0) {
        return interaction.reply({ content: '📭 Your playlist is empty.', flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply();

      const settings = await getMusicSettings(interaction.guild.id).catch(() => ({ maxQueue: 50 }));
      let player;
      try {
        player = getOrCreatePlayer(interaction, { volume: settings.defaultVolume });
        if (!player.connected) await player.connect();
      } catch {
        try { await player?.destroy?.().catch(() => {}); } catch {}
        return interaction.editReply('🔌 Could not join voice. I cleaned up — try again.');
      }

      const room = Math.max((settings.maxQueue ?? 50) - player.queue.tracks.length, 0);
      let added = 0;
      for (const song of list.slice(0, Math.max(room, 0))) {
        try {
          const result = await searchTrack(song.url || song.title, interaction.user.tag, interaction.user.id);
          if (result) {
            player.queue.add(result.track);
            added++;
          }
        } catch {}
      }

      if (!player.playing && !player.paused && added > 0) {
        try {
          await player.play();
        } catch (err) {
          return interaction.editReply(`❌ Couldn't start playback: ${err.message || err}`);
        }
      }

      return interaction.editReply(`➕ Queued ${added} song(s) from your saved playlist.`);
    }
  },
};
