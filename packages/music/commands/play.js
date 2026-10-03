const { SlashCommandBuilder, MessageFlags, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const { getOrCreatePlayer, searchTrack, getManager } = require('../lib/lavalink');
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
    const member = interaction.member ?? await interaction.guild.members.fetch(interaction.user.id);
    const voiceChannel = member.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: '🚫 Join a voice channel first.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();

    // Gate: check if Lavalink node is connected; wait up to 5 seconds if not
    const node = getManager().nodeManager.nodes.get('main');
    if (!node || !node.connected) {
      await interaction.editReply('🔄 Reconnecting to the music server, one sec…');
      const reconnected = await new Promise((resolve) => {
        const check = setInterval(() => {
          if (node?.connected) {
            clearInterval(check);
            resolve(true);
          }
        }, 500);
        setTimeout(() => { clearInterval(check); resolve(false); }, 5000);
      });
      if (!reconnected) {
        return interaction.editReply('⚠️ Music server is still reconnecting — try again in a few seconds.');
      }
    }

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
        await interaction.editReply(`➕ Queued playlist **${playlistName || 'mix'}** — **${toAdd.length}** songs in order (now at ${player.queue.tracks.length}).`);
      } else {
        await interaction.editReply(`➕ Added to queue: **${track.info.title}** (position ${player.queue.tracks.length})`);
      }

      // Send song suggestions (only for single track, not playlists)
      if (!isPlaylist) {
        try {
          const node = getManager().nodeManager.leastUsedNodes()[0];
          if (node) {
            // Search for related tracks using the queued track's artist
            const relatedRes = await node.search(
              { query: track.info.author, source: 'ytsearch' },
              interaction.user.tag
            );

            if (relatedRes && relatedRes.tracks && relatedRes.tracks.length > 0) {
              // Filter out the track that was just queued
              const related = relatedRes.tracks
                .filter(t => t.info.uri !== track.info.uri)
                .slice(0, 5);

              if (related.length > 0) {
                // Build select menu options
                const options = related.map(t => ({
                  label: t.info.title.length > 100 ? t.info.title.slice(0, 97) + '...' : t.info.title,
                  value: t.info.uri.length > 100 ? `${t.info.sourceName}:${t.info.identifier}` : t.info.uri,
                  description: t.info.author.length > 100 ? t.info.author.slice(0, 97) + '...' : t.info.author,
                }));

                const selectMenu = new StringSelectMenuBuilder()
                  .setCustomId(`suggest:${interaction.guildId}`)
                  .setPlaceholder('🎵 Select a suggested song')
                  .addOptions(options);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                await interaction.followUp({
                  content: '🎵 Or pick a related song:',
                  components: [row],
                }).catch(() => {});
              }
            }
          }
        } catch (err) {
          console.error('Error fetching song suggestions:', err);
          // Silently fail — don't break the main /play flow
        }
      }
    }
  },
};
