const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getUserStats, getServerStats, fmtTime } = require('../lib/history');

const PERIODS = ['today', 'week', 'month', 'all'];

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
      let s;
      try {
        s = await getUserStats(interaction.guild.id, target.id, period);
      } catch {
        return interaction.reply({ content: '⚠️ Stats unavailable — database is unreachable.', flags: MessageFlags.Ephemeral });
      }
      const artists = s.topArtists.map((a, i) => `${i + 1}. **${a.artist}** — ${a.plays} plays`).join('\n') || 'No data yet.';
      const hist = s.history.map((h) => `• **${h.title}** — ${h.artist} (${fmtTime(h.listened_sec)}, ${h.status})`).join('\n').slice(0, 1500) || 'No plays yet.';
      const embed = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setAuthor({ name: target.tag, iconURL: target.displayAvatarURL() })
        .setTitle(`📊 ${period} stats`)
        .addFields(
          { name: 'Songs requested', value: `**${s.songs}**`, inline: true },
          { name: 'Listening time', value: `**${fmtTime(s.listened)}**`, inline: true },
          { name: 'Artists', value: `**${s.artists}**`, inline: true },
          { name: 'Favourite artists', value: artists },
          { name: 'Recent history', value: hist },
        )
        .setFooter({ text: 'Dominyx • Stats' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    let s;
    try {
      s = await getServerStats(interaction.guild.id, period);
    } catch {
      return interaction.reply({ content: '⚠️ Stats unavailable — database is unreachable.', flags: MessageFlags.Ephemeral });
    }
    const artists = s.topArtists.map((a, i) => `${i + 1}. **${a.artist}** — ${a.plays} plays`).join('\n') || 'No data yet.';
    const songs = s.topSongs.map((t, i) => `${i + 1}. **${t.title}** — ${t.artist} (${t.plays}×)`).join('\n').slice(0, 1000) || 'No data yet.';
    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle(`📊 ${interaction.guild.name} — ${period}`)
      .addFields(
        { name: 'Tracks played', value: `**${s.tracks}**`, inline: true },
        { name: 'Listening time', value: `**${fmtTime(s.listened)}**`, inline: true },
        { name: 'Unique requesters', value: `**${s.requesters}**`, inline: true },
        { name: 'Top artists', value: artists },
        { name: 'Top songs', value: songs },
      )
      .setFooter({ text: 'Dominyx • Stats' })
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  },
};
