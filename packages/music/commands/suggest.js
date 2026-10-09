const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildSuggestMessage, rememberMenu } = require('../lib/suggestMenu');
const { getManager } = require('../lib/lavalink');
const { getLastGuildTrack } = require('../lib/history');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Related songs for what is playing (or name a seed)')
    .addStringOption(opt => opt.setName('seed').setDescription('Song or artist to base suggestions on')),

  async execute(interaction) {
    const seedOpt = interaction.options.getString('seed');
    let title = seedOpt;
    let artist = '';
    if (!title) {
      let cur;
      try {
        cur = getManager()?.getPlayer(interaction.guild.id)?.queue?.current;
      } catch {
        cur = null;
      }
      if (cur) {
        title = cur.info.title;
        artist = cur.info.author || '';
      } else {
        const last = await getLastGuildTrack(interaction.guild.id).catch(() => null);
        if (!last) {
          return interaction.reply({ content: '❌ Nothing playing and no history — give me a seed: `/suggest seed:arijit`.', flags: MessageFlags.Ephemeral });
        }
        title = last.title;
        artist = last.artist;
      }
    }
    await interaction.deferReply();
    const built = await buildSuggestMessage(title, artist, interaction.user.tag);
    const msg = await interaction.editReply({ embeds: built.embeds, components: built.components });
    rememberMenu(msg.id, built.items);
  },
};
