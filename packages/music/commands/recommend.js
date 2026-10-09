const {
  SlashCommandBuilder, EmbedBuilder, MessageFlags,
  ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const { MOODS, moodQueries } = require('../lib/moods');
const { searchTrack, getOrCreatePlayer, getManager } = require('../lib/lavalink');
const { getMusicSettings, requireDj } = require('../lib/settings');

// messageId -> { mood, queries }
const menus = new Map();

function moodEmbed(mood, queries) {
  return new EmbedBuilder()
    .setColor(0x10B981)
    .setTitle(`🎧 Mood: ${mood}`)
    .setDescription(`${MOODS[mood]?.blurb || ''}\n\n${queries.map((q, i) => `${i + 1}. **${q}**`).join('\n')}`)
    .setFooter({ text: 'Dominyx • Moods' });
}

function moodComponents(mood, salt) {
  const queries = moodQueries(mood, 5, salt);
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`mood_pick:${mood}:${salt}`)
    .setPlaceholder('Pick one to queue…')
    .addOptions(queries.map((q, i) => ({ label: q.slice(0, 100), value: String(i) })));
  return { queries, rows: [new ActionRowBuilder().addComponents(menu)] };
}

function moodButtons(mood, salt) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`mood_play:${mood}:${salt}`).setLabel('▶️ Play Now').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`mood_add:${mood}:${salt}`).setLabel('➕ Add to Queue').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`mood_refresh:${mood}:${salt}`).setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary),
  );
}

async function resolveFirst(query, tag, userId) {
  const result = await searchTrack(query, tag, userId);
  return result?.track || null;
}

async function ensurePlayer(interaction) {
  const voiceChannel = interaction.member?.voice?.channel;
  if (!voiceChannel) throw new Error('voice');
  const settings = await getMusicSettings(interaction.guild.id).catch(() => ({}));
  const player = getOrCreatePlayer(interaction, { volume: settings.defaultVolume });
  if (!player.connected) await player.connect();
  return { player, settings };
}

async function handleMoodPick(interaction) {
  const [, mood, salt] = interaction.customId.split(':');
  const queries = moodQueries(mood, 5, Number(salt) || 0);
  const track = await resolveFirst(queries[Number(interaction.values[0]) || 0], interaction.user.tag, interaction.user.id).catch(() => null);
  if (!track) return interaction.reply({ content: '❌ Couldn\u2019t find that one.', flags: MessageFlags.Ephemeral });
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  let player;
  try {
    ({ player } = await ensurePlayer(interaction));
  } catch {
    return interaction.editReply('🚫 Join a voice channel first.');
  }
  player.queue.add(track);
  if (!player.playing && !player.paused) {
    try {
      await player.play();
    } catch (err) {
      return interaction.editReply(`❌ Couldn't start: ${err.message || err}`);
    }
    return interaction.editReply(`🎶 Playing **${track.info.title}**.`);
  }
  return interaction.editReply(`➕ Queued **${track.info.title}**.`);
}

async function handleMoodButton(interaction, client) {
  const [kind, mood, salt] = interaction.customId.split(':');
  if (kind === 'mood_refresh') {
    const nsalt = (Number(salt) || 0) + 5;
    return interaction.update({ embeds: [moodEmbed(mood, moodQueries(mood, 5, nsalt))], components: [...moodComponents(mood, nsalt).rows, moodButtons(mood, nsalt)] });
  }
  if (!(await requireDj(interaction))) return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const queries = moodQueries(mood, 5, Number(salt) || 0);
  if (kind === 'mood_add') {
    let player;
    try {
      ({ player } = await ensurePlayer(interaction));
    } catch {
      return interaction.editReply('🚫 Join a voice channel first.');
    }
    let added = 0;
    for (const q of queries) {
      try {
        const t = await resolveFirst(q, interaction.user.tag, interaction.user.id);
        if (t && player.queue.tracks.length < 50) {
          player.queue.add(t);
          added++;
        }
      } catch {}
    }
    if (added > 0 && !player.playing && !player.paused) {
      const { clearStaleCurrent } = require('../lib/lavalink');
      clearStaleCurrent(player);
      try {
        await player.play();
      } catch {}
    }
    return interaction.editReply(added > 0 ? `➕ Queued **${added}** ${mood} track(s).` : '❌ Nothing resolved — try Refresh.');
  }
  // mood_play: interrupt with the top pick.
  const track = await resolveFirst(queries[0], interaction.user.tag, interaction.user.id).catch(() => null);
  if (!track) return interaction.editReply('❌ Couldn\u2019t find that one.');
  let player;
  try {
    ({ player } = await ensurePlayer(interaction));
  } catch {
    return interaction.editReply('🚫 Join a voice channel first.');
  }
  player.queue.tracks.unshift(track);
  if (player.playing || player.paused) {
    await player.skip(0, false).catch(() => player.play().catch(() => {}));
  } else {
    const { clearStaleCurrent } = require('../lib/lavalink');
    clearStaleCurrent(player);
    try {
      await player.play();
    } catch (err) {
      return interaction.editReply(`❌ Couldn't start: ${err.message || err}`);
    }
  }
  return interaction.editReply(`▶️ Now: **${track.info.title}**.`);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recommend')
    .setDescription('Music for a mood')
    .addStringOption(opt =>
      opt.setName('mood')
        .setDescription('Pick a vibe')
        .setRequired(true)
        .addChoices(...Object.keys(MOODS).map((m) => ({ name: m, value: m })))),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Server-only command.', flags: MessageFlags.Ephemeral });
    }
    const mood = interaction.options.getString('mood');
    if (!MOODS[mood]) return interaction.reply({ content: '❌ Bad mood.', flags: MessageFlags.Ephemeral });
    await interaction.deferReply();
    const salt = 0;
    await interaction.editReply({
      embeds: [moodEmbed(mood, moodQueries(mood, 5, salt))],
      components: [...moodComponents(mood, salt).rows, moodButtons(mood, salt)],
    });
  },

  handleMoodPick,
  handleMoodButton,
};
