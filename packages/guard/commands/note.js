const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { addNote, getNotes } = require('../lib/modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('note')
    .setDescription('Staff notes on a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a staff note about a member')
        .addUserOption(opt => opt.setName('user').setDescription('User to note').setRequired(true))
        .addStringOption(opt => opt.setName('note').setDescription('The note text').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('show')
        .setDescription('Show all notes for a member')
        .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('user');

    if (sub === 'add') {
      const note = interaction.options.getString('note');
      await addNote(interaction.guild.id, target.id, note, interaction.user.tag);
      return interaction.reply({ content: `📝 Note added for **${target.tag}**.`, flags: MessageFlags.Ephemeral });
    }

    if (sub === 'show') {
      const notes = await getNotes(interaction.guild.id, target.id);
      if (notes.length === 0) {
        return interaction.reply({ content: `📭 No notes for **${target.tag}**.`, flags: MessageFlags.Ephemeral });
      }

      const text = notes.map(n =>
        `**${new Date(n.created_at).toLocaleDateString()}** by ${n.added_by}\n${n.note}`
      ).join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(0xDC143C)
        .setTitle(`📝 Notes for ${target.tag}`)
        .setDescription(text.slice(0, 4000))
        .setFooter({ text: 'Dominyx • Guard' });

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  },
};
