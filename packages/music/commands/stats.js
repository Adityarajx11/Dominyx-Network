const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getUserStats, getServerStats, fmtTime } = require('../lib/history');
const { getSeasonXp, currentSeason } = require('../lib/musicXp');

const PERIODS = ['today', 'week', 'month', 'all'];

const PERIOD_LABEL = { today: 'Today', week: 'This week', month: 'This month', all: 'All time' };

function periodChoices() {
  return [
    { name: 'Today', value: 'today' },
    { name: 'This week', value: 'week' },
    { name: 'This month', value: 'month' },
    { name: 'All time', value: 'all' },
  ];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Listening stats from actual playback')
    .addSubcommand(sub =>
      sub.setName('user')
        .setDescription('Stats for you or someone else')
        .addUserOption(opt => opt.setName('user').setDescription('Who to check'))
        .addStringOption(opt =>
          opt.setName('period').setDescription('Time range').addChoices(...periodChoices())))
    .addSubcommand(sub =>
      sub.setName('server')
        .setDescription('Stats for this server')
        .addStringOption(opt =>
          opt.setName('period').setDescription('Time range').addChoices(...periodChoices()))),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Server-only command.', flags: MessageFlags.Ephemeral });
    }
    const sub = interaction.options.getSubcommand();
    const period = interaction.options.getString('period') || 'week';
    if (!PERIODS.includes(period)) {
      return interaction.reply({ content: '❌ Bad period.', flags: MessageFlags.Ephemeral });
    }

    if (sub === 'user') {
      const target = interaction.options.getUser('user') || interaction.user;
      await interaction.deferReply();
      let s;
      try {
        s = await getUserStats(interaction.guild.id, target.id, period);
      } catch {
        return interaction.editReply({ content: '⚠️ Stats unavailable — database is unreachable.' });
      }
      const artists = s.topArtists.map((a, i) => `${i + 1}. **${String(a.artist).slice(0, 60)}** — ${a.plays} plays`).join('\n').slice(0, 900) || '_No data yet — play something first._';
      const hist = s.history.slice(0, 6).map((h) => `• **${String(h.title).slice(0, 60)}** — ${String(h.artist).slice(0, 30)} (${fmtTime(h.listened_sec)})`).join('\n').slice(0, 900) || '_No plays yet._';
      const seasonXp = await getSeasonXp(interaction.guild.id, target.id).catch(() => 0);
      const embed = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setAuthor({ name: `${target.username} — listening stats`, iconURL: target.displayAvatarURL() })
        .setTitle(`📊 ${PERIOD_LABEL[period]} · ${interaction.guild.name}`)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: '🎵 Songs requested', value: `**${s.songs}**`, inline: true },
          { name: '⏱️ Listening time', value: `**${fmtTime(s.listened)}**`, inline: true },
          { name: '✨ Season XP', value: `**${seasonXp}**`, inline: true },
          { name: '💿 Favourite artists', value: artists },
          { name: '🕘 Recent plays', value: hist },
        )
        .setFooter({ text: `Dominyx • Stats • ${target.tag}`, iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();
      const sent = await interaction.editReply({ embeds: [embed] });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 120000);
      return sent;
    }

    let s;
    await interaction.deferReply();
    try {
      s = await getServerStats(interaction.guild.id, period);
    } catch {
      return interaction.editReply({ content: '⚠️ Stats unavailable — database is unreachable.' });
    }
    const artists = s.topArtists.map((a, i) => `${i + 1}. **${String(a.artist).slice(0, 60)}** — ${a.plays} plays`).join('\n').slice(0, 900) || '_No data yet — play something first._';
    const songs = s.topSongs.map((t, i) => `${i + 1}. **${String(t.title).slice(0, 60)}** — ${String(t.artist).slice(0, 30)} (${t.plays}×)`).join('\n').slice(0, 900) || '_No data yet._';
    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle(`📊 ${interaction.guild.name}`)
      .setDescription(`*${PERIOD_LABEL[period]} · ${s.tracks} tracks · ${fmtTime(s.listened)} listened*`)
      .setThumbnail(interaction.guild.iconURL() ?? undefined)
      .addFields(
        { name: '🎵 Tracks played', value: `**${s.tracks}**`, inline: true },
        { name: '⏱️ Listening time', value: `**${fmtTime(s.listened)}**`, inline: true },
        { name: '🙋 Unique requesters', value: `**${s.requesters}**`, inline: true },
        { name: '💿 Top artists', value: artists },
        { name: '🔥 Top songs', value: songs },
      )
      .setFooter({ text: `Dominyx • Stats • season ${currentSeason()}`, iconURL: interaction.client.user.displayAvatarURL() })
      .setTimestamp();
    const sent = await interaction.editReply({ embeds: [embed] });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 120000);
    return sent;
  },
};
