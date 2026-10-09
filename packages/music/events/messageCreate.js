// Prefix fallback (!p / -p) for servers where slash commands are hidden.
// Luna-style: !p <song>, -p <song>, !skip, !stop, !pause, !resume, !queue, !np, etc.
const { getOrCreatePlayer, searchTrack, getManager } = require('../lib/lavalink');
const { getMusicSettings } = require('../lib/settings');

const ALIASES = {
  p: 'play', play: 'play',
  sk: 'skip', skip: 'skip', n: 'skip',
  stop: 'stop', leave: 'stop',
  pause: 'pause', resume: 'resume', r: 'resume',
  q: 'queue', queue: 'queue',
  np: 'nowplaying', nowplaying: 'nowplaying',
  vol: 'volume', volume: 'volume',
  sh: 'shuffle', shuffle: 'shuffle',
  loop: 'loop',
  mylist: 'mylist',
};

async function isDj(message) {
  try {
    if (message.member?.permissions?.has?.('Administrator')) return true;
    const settings = await getMusicSettings(message.guild.id);
    if (!settings.djRoleId) return true;
    return !!message.member?.roles?.cache?.has(settings.djRoleId);
  } catch {
    return true;
  }
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    try {
      if (!message.guild || message.author.bot) return;
      const text = (message.content || '').trim();
      if (!text) return;
      // Only the server prefix works — no fallback (owner's choice).
      let serverPrefix = '!';
      try {
        const s = await getMusicSettings(message.guild.id);
        if (s.prefix) serverPrefix = s.prefix;
      } catch {}
      if (!text.startsWith(serverPrefix)) return;
      const prefix = serverPrefix;

      const [raw, ...rest] = text.slice(prefix.length).trim().split(/\s+/);
      if (!raw) return;
      const cmd = ALIASES[raw.toLowerCase()];
      if (!cmd) return;

      // DJ-gated like the slash versions.
      const gated = ['play', 'pause', 'resume', 'skip', 'stop', 'loop', 'shuffle', 'volume'].includes(cmd);
      if (gated && !(await isDj(message))) {
        await message.reply('🚫 You need the DJ role to control the music.').catch(() => {});
        return;
      }

      const voiceChannel = message.member?.voice?.channel;
      if (['play', 'skip', 'stop', 'pause', 'resume', 'loop', 'shuffle', 'volume', 'nowplaying', 'queue'].includes(cmd) && !voiceChannel) {
        await message.reply('🚫 Join a voice channel first.').catch(() => {});
        return;
      }

      const player = () => getManager().getPlayer(message.guild.id);

      if (cmd === 'play') {
        const query = rest.join(' ');
        if (!query) {
          await message.reply('🎶 Usage: `!p <song name or link>`').catch(() => {});
          return;
        }
        const settings = await getMusicSettings(message.guild.id);
        let result;
        try {
          result = await searchTrack(query, message.author.tag, message.author.id);
        } catch {
          await message.reply('🔌 Music server is waking up — try again in ~20 seconds.').catch(() => {});
          return;
        }
        if (!result) {
          await message.reply('❌ Couldn\u2019t find that song.').catch(() => {});
          return;
        }
        const { track, tracks, playlistName, isPlaylist } = result;
        const { clearStaleCurrent } = require('../lib/lavalink');
        const pl = getOrCreatePlayer(message, { volume: settings.defaultVolume });
        try {
          if (!pl.connected) await pl.connect();
          clearStaleCurrent(pl);
        } catch {
          try { await pl.destroy().catch(() => {}); } catch {}
          await message.reply('🔌 Voice connection went stale — run `!p` again once.').catch(() => {});
          return;
        }
        if (pl.queue.tracks.length >= settings.maxQueue) {
          await message.reply(`🚫 Queue is full (max ${settings.maxQueue}).`).catch(() => {});
          return;
        }
        const room = settings.maxQueue - pl.queue.tracks.length;
        const toAdd = isPlaylist ? tracks.slice(0, Math.max(room, 1)) : [track];
        for (const t of toAdd) pl.queue.add(t);
        if (!pl.playing && !pl.paused) {
          await pl.play();
          // No "Loading..." spam — trackStart posts the now-playing card.
          if (isPlaylist && toAdd.length > 1) {
            await message.reply(`➕ Playlist **${playlistName || 'mix'}** — **${toAdd.length}** songs queued.`).catch(() => {});
          }
        } else {
          if (isPlaylist && toAdd.length > 1) {
            await message.reply(`➕ Playlist **${playlistName || 'mix'}** — **${toAdd.length}** songs queued in order.`).catch(() => {});
          } else {
            await message.reply(`➕ Added: **${track.info.title}** (#${pl.queue.tracks.length})`).catch(() => {});
          }
        }
        return;
      }

      if (cmd === 'skip') {
        const pl = player();
        if (!pl) return message.reply('🚫 Nothing is playing.').catch(() => {});
        await pl.skip(0, false).catch(() => {});
        return message.reply('⏭️ Skipped.').catch(() => {});
      }

      if (cmd === 'stop') {
        const pl = player();
        if (!pl) return message.reply('🚫 Nothing is playing.').catch(() => {});
        pl.queue.tracks.splice(0, pl.queue.tracks.length);
        await pl.stopPlaying(true).catch(() => {});
        try {
          pl.playing = false;
          pl.paused = false;
          pl.queue.current = null;
        } catch {}
        return message.reply('⏹️ Stopped.').catch(() => {});
      }

      if (cmd === 'pause') {
        const pl = player();
        if (!pl) return message.reply('🚫 Nothing is playing.').catch(() => {});
        await pl.pause().catch(() => {});
        return message.reply('⏸️ Paused.').catch(() => {});
      }

      if (cmd === 'resume') {
        const pl = player();
        if (!pl) return message.reply('🚫 Nothing is playing.').catch(() => {});
        await pl.resume().catch(() => {});
        return message.reply('▶️ Resumed.').catch(() => {});
      }

      if (cmd === 'queue') {
        const pl = player();
        if (!pl || (!pl.queue.current && pl.queue.tracks.length === 0)) {
          return message.reply('📭 Queue is empty.').catch(() => {});
        }
        const lines = pl.queue.tracks.slice(0, 10).map((t, i) => `${i + 1}. **${t.info.title}**`);
        return message.reply(`🎶 Now: **${pl.queue.current?.info?.title || '—'}**\n${lines.join('\n') || '_No up-next_'}`.slice(0, 1900)).catch(() => {});
      }

      if (cmd === 'nowplaying') {
        const pl = player();
        const cur = pl?.queue?.current;
        if (!cur) return message.reply('🚫 Nothing is playing.').catch(() => {});
        return message.reply(`🎵 **${cur.info.title}** — ${cur.info.author || 'Unknown'}`).catch(() => {});
      }

      if (cmd === 'volume') {
        const pl = player();
        const val = parseInt(rest[0], 10);
        if (!pl) return message.reply('🚫 Nothing is playing.').catch(() => {});
        if (!Number.isInteger(val) || val < 0 || val > 200) {
          return message.reply(`🔊 Volume is **${pl.volume}%**. Use \`!vol <0-200>\`.`).catch(() => {});
        }
        await pl.setVolume(val).catch(() => {});
        return message.reply(`🔊 Volume → **${val}%**.`).catch(() => {});
      }

      if (cmd === 'shuffle') {
        const pl = player();
        if (!pl || pl.queue.tracks.length < 2) return message.reply('🚫 Not enough songs to shuffle.').catch(() => {});
        try {
          await pl.queue.shuffle();
        } catch {
          return message.reply('❌ Shuffle failed.').catch(() => {});
        }
        return message.reply('🔀 Shuffled.').catch(() => {});
      }

      if (cmd === 'loop') {
        const pl = player();
        if (!pl) return message.reply('🚫 Nothing is playing.').catch(() => {});
        try {
          const order = ['off', 'track', 'queue'];
          const next = order[(order.indexOf(pl.repeatMode) + 1) % order.length];
          pl.setRepeatMode(next);
          return message.reply(`🔁 Loop → **${next}**.`).catch(() => {});
        } catch {
          return message.reply('❌ Loop change failed.').catch(() => {});
        }
      }

      if (cmd === 'mylist') {
        return message.reply('📝 Playlists live in slash `/mylist` — prefix supports playback only.').catch(() => {});
      }
    } catch (err) {
      console.error('Prefix command error:', err.message);
    }
  },
};
