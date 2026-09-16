const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const { getGuardSettings } = require('./guardStore');

async function handleSelfRoleSelect(interaction) {
  const settings = await getGuardSettings(interaction.guild.id);
  const categories = settings?.self_role_categories || {};

  if (interaction.customId === 'selfrole_category') {
    const categoryName = interaction.values[0];
    const roleIds = categories[categoryName] || [];

    if (roleIds.length === 0) {
      return interaction.update({ content: '📭 This category has no roles.', components: [] });
    }

    const member = interaction.member;
    const options = roleIds.slice(0, 25).map(id => {
      const role = interaction.guild.roles.cache.get(id);
      return {
        label: role ? role.name : 'Unknown role',
        value: id,
        default: member.roles.cache.has(id),
      };
    });

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`selfrole_pick_${categoryName}`)
      .setPlaceholder('Select the roles you want')
      .setMinValues(0)
      .setMaxValues(options.length)
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.update({
      content: `🎭 **${categoryName}** — select the roles you want, then submit:`,
      components: [row],
    });
  }

  if (interaction.customId.startsWith('selfrole_pick_')) {
    const categoryName = interaction.customId.replace('selfrole_pick_', '');
    const roleIdsInCategory = categories[categoryName] || [];
    const selectedIds = interaction.values;

    const member = interaction.member;
    const toAdd = selectedIds.filter(id => !member.roles.cache.has(id));
    const toRemove = roleIdsInCategory.filter(id => !selectedIds.includes(id) && member.roles.cache.has(id));

    for (const id of toAdd) {
      await member.roles.add(id).catch(() => {});
    }
    for (const id of toRemove) {
      await member.roles.remove(id).catch(() => {});
    }

    const addedNames = toAdd.map(id => interaction.guild.roles.cache.get(id)?.name).filter(Boolean);
    const removedNames = toRemove.map(id => interaction.guild.roles.cache.get(id)?.name).filter(Boolean);

    let summary = `✅ Updated your **${categoryName}** roles.`;
    if (addedNames.length) summary += `\n➕ Added: ${addedNames.join(', ')}`;
    if (removedNames.length) summary += `\n➖ Removed: ${removedNames.join(', ')}`;

    return interaction.update({ content: summary, components: [] });
  }
}

module.exports = { handleSelfRoleSelect };