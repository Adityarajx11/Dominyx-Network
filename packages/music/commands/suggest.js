const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildArtistSuggest, buildRelatedSuggest, rememberMenu } = require('../lib/suggestMenu');
const { getManager } = require('../lib/lavalink');
const { getLastGuildTrack } = require('../lib/history');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('More songs from an artist')
    .addStringOption(opt => opt.setName('artist').setDescription('Artist name (default: current song\u2019s artist)')),

  async execute(interaction) {
    const seedOpt = (interaction.options.getString('artist') || '').trim();
    await interaction.deferReply();
    let built;
    if (seedOpt) {
      built = await buildArtistSuggest(seedOpt, interaction.user.tag);
    } else {
      let cur;
      try {
        cur = getManager()?.getPlayer(interaction.guild.id)?.queue?.current;
      } catch {
        cur = null;
      }
      if (cur?.info?.title) {
        built = await buildRelatedSuggest(cur, interaction.user.tag);
      } else {
        const last = await getLastGuildTrack(interaction.guild.id).catch(() => null);
        if (!last?.artist) {
          return interaction.reply({ content: '❌ Nothing playing and no history — give me an artist: `/suggest artist:arijit`.', flags: MessageFlags.Ephemeral });
        }
        built = await buildRelatedSuggest(
          { info: { title: last.title, author: last.artist, uri: last.url } },
          interaction.user.tag
        );
      }
    }
    const msg = await interaction.editReply({ embeds: built.embeds, components: built.components });
    rememberMenu(msg.id, built.items);
  },
};
