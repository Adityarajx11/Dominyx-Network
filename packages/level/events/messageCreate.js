const { getUserXp, upsertUserXp, getLevelRoles, getLevelConfig } = require('../lib/db');
const { calculateLevelUp, isOnCooldown } = require('../lib/leveling');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    if (isOnCooldown(message.guild.id, message.author.id)) return;

    const existing = await getUserXp(message.guild.id, message.author.id);
    const currentXp = existing?.xp || 0;
    const currentLevel = existing?.level || 0;

    const earnedXp = Math.floor(Math.random() * 11) + 15;
    const { xp, level, levelsGained } = calculateLevelUp(currentXp, currentLevel, earnedXp);

    await upsertUserXp(message.guild.id, message.author.id, xp, level, new Date());

    if (levelsGained > 0) {
      const config = await getLevelConfig(message.guild.id);
      const template = config?.message_template || '🎉 {user} leveled up to **Level {level}**!';
      const text = template.replaceAll('{user}', `${message.author}`).replaceAll('{level}', `${level}`);

      const targetChannel = config?.channel_id
        ? message.guild.channels.cache.get(config.channel_id)
        : message.channel;

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('🎉 Level Up!')
        .setDescription(template.replaceAll('{user}', message.author.toString()).replaceAll('{level}', level))
        .setThumbnail(message.author.displayAvatarURL())
        .setFooter({ text: 'Dominyx • Level Up', iconURL: message.client.user.displayAvatarURL() })
        .setTimestamp();

      targetChannel?.send({ content: text, embeds: [embed] }).catch(() => {});

      const levelRoles = await getLevelRoles(message.guild.id);
      const roleToGrant = levelRoles.filter(r => r.level <= level).sort((a, b) => b.level - a.level)[0];

      if (roleToGrant) {
        const role = message.guild.roles.cache.get(roleToGrant.role_id);
        const member = message.member;
        if (role && member && !member.roles.cache.has(role.id)) {
          member.roles.add(role).catch(() => {});
        }
      }
    }
  },
};