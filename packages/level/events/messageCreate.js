const { getUserXp, upsertUserXp, getLevelRoles, getLevelConfig } = require('../lib/db');
const { calculateLevelUp, isOnCooldown } = require('../lib/leveling');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const config = await getLevelConfig(message.guild.id).catch(() => null);
    const xpMin = Number.isInteger(config?.xp_min) ? config.xp_min : 15;
    const xpMax = Number.isInteger(config?.xp_max) ? Math.max(xpMin, config.xp_max) : 25;
    const cooldownMs = (Number.isInteger(config?.cooldown_seconds) ? config.cooldown_seconds : 60) * 1000;
    const ignoredChannels = Array.isArray(config?.ignored_channels) ? config.ignored_channels : [];
    const ignoredRoles = Array.isArray(config?.ignored_roles) ? config.ignored_roles : [];
    const roleStack = config?.role_stack ?? true;

    if (ignoredChannels.includes(message.channel.id)) return;
    if (ignoredRoles.length > 0 && message.member?.roles?.cache?.hasAny?.(...ignoredRoles)) return;

    if (isOnCooldown(message.guild.id, message.author.id, cooldownMs)) return;

    const existing = await getUserXp(message.guild.id, message.author.id);
    const currentXp = existing?.xp || 0;
    const currentLevel = existing?.level || 0;

    const earnedXp = Math.floor(Math.random() * (xpMax - xpMin + 1)) + xpMin;
    const { xp, level, levelsGained } = calculateLevelUp(currentXp, currentLevel, earnedXp);

    await upsertUserXp(message.guild.id, message.author.id, xp, level, new Date());

    if (levelsGained > 0) {
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
          // When stacking is off, remove older level roles first.
          if (!roleStack) {
            const otherIds = levelRoles
              .map(r => r.role_id)
              .filter(id => id !== role.id && member.roles.cache.has(id));
            for (const id of otherIds) {
              await member.roles.remove(id).catch(() => {});
            }
          }
          member.roles.add(role).catch(() => {});
        }
      }
    }
  },
};