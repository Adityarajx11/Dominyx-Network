const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getOrCreatePlayer, searchTrack } = require('../lib/lavalink');
const { getMusicSettings } = require('../lib/settings');

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
      return interaction.reply({ content: '🚫 Join a voice channel first.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();

    const settings = await getMusicSettings(interaction.guild.id);
    const query = interaction.options.getString('song');
    const result = await searchTrack(query, interaction.user.tag);

    if (!result) {
      return interaction.editReply('❌ Couldn\'t find that song.');
    }
    const { track, tracks, playlistName, isPlaylist } = result;

    const player = getOrCreatePlayer(interaction, { volume: settings.defaultVolume });
    if (!player.connected) await player.connect();

    if (player.queue.tracks.length >= settings.maxQueue) {
      return interaction.editReply(`🚫 Queue is full (max ${settings.maxQueue} songs). Use \`/skip\` or \`/stop\` to make room.`);
    }

    // Playlists: fill the queue in order, capped at maxQueue.
    // Plain searches: first match only.
    const room = settings.maxQueue - player.queue.tracks.length;
    const toAdd = isPlaylist ? tracks.slice(0, Math.max(room, 1)) : [track];
    for (const t of toAdd) player.queue.add(t);

    if (!player.playing && !player.paused) {
      await player.play();
      // No "Loading..." spam — trackStart posts the now-playing card.
      // Just clear the deferred reply; errors still arrive via followUp.
      await interaction.deleteReply().catch(() => {});
      // Watchdog: "Loading" that never resolves means Lavalink couldn't start
      // the audio (blocked source / dead node) — say so instead of hanging.
      setTimeout(async () => {
        try {
          const p = getManager().getPlayer(interaction.guild.id);
          if (p && !p.playing && !p.paused && p.queue.current?.info?.title === track.info.title) {
            await interaction.followUp({
              content: `❌ **${track.info.title}** never started — the audio source is blocking this server. Try a Spotify/SoundCloud link or another song.`,
              flags: MessageFlags.Ephemeral,
            }).catch(() => {});
          }
        } catch {}
      }, 12000).unref?.();
      return;
    } else {
      if (isPlaylist && toAdd.length > 1) {
        return interaction.editReply(`➕ Queued playlist **${playlistName || 'mix'}** — **${toAdd.length}** songs in order (now at ${player.queue.tracks.length}).`);
      }
      return interaction.editReply(`➕ Added to queue: **${track.info.title}** (position ${player.queue.tracks.length})`);
    }
  },
};
