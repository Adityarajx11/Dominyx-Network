const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildArtistSuggest, rememberMenu } = require('../lib/suggestMenu');
const { getManager } = require('../lib/lavalink');
const { getLastGuildTrack } = require('../lib/history');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('More songs from an artist')
    .addStringOption(opt => opt.setName('artist').setDescription('Artist name (default: current song\u2019s artist)')),

  async execute(interaction) {
    const seedOpt = (interaction.options.getString('artist') || '').trim();
    let artist = seedOpt;
    if (!artist) {
      let cur;
      try {
        cur = getManager()?.getPlayer(interaction.guild.id)?.queue?.current;
      } catch {
        cur = null;
      }
      if (cur?.info?.author) {
        artist = cur.info.author;
      } else {
        const last = await getLastGuildTrack(interaction.guild.id).catch(() => null);
        if (!last?.artist) {
          return interaction.reply({ content: '❌ Nothing playing and no history — give me an artist: `/suggest artist:arijit`.', flags: MessageFlags.Ephemeral });
        }
        artist = last.artist;
      }
    }
    await interaction.deferReply();
    const built = await buildArtistSuggest(artist, interaction.user.tag);
    const msg = await interaction.editReply({ embeds: built.embeds, components: built.components });
    rememberMenu(msg.id, built.items);
  },
};
