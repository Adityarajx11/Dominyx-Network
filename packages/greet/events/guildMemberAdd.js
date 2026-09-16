const { AttachmentBuilder } = require('discord.js');
const { getGreetSettings } = require('../lib/settings');
const { generateWelcomeCard } = require('../lib/welcomeCard');

const DEFAULT_TEMPLATE = '🚀 {user} just landed in {server}! We\'re now {membercount} members strong.';

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    try {
      const guildId = member.guild.id;
      const settings = await getGreetSettings(guildId);

      if (settings.autoRoleId) {
        try {
          const role = member.guild.roles.cache.get(settings.autoRoleId);
          if (role) await member.roles.add(role);
        } catch (err) {
          console.warn(`⚠️ Could not assign auto-role to ${member.user.tag}:`, err.message);
        }
      }

      if (!settings.welcomeChannelId) return;

      const channel = member.guild.channels.cache.get(settings.welcomeChannelId);
      if (!channel) return;

      const template = settings.welcomeMessage || DEFAULT_TEMPLATE;
      const welcomeMessage = template
        .replaceAll('{user}', member.toString())
        .replaceAll('{username}', member.user.username)
        .replaceAll('{server}', member.guild.name)
        .replaceAll('{membercount}', String(member.guild.memberCount));

      const sendOptions = { content: welcomeMessage };

      if (settings.cardEnabled !== false) {
        try {
          const imageBuffer = await generateWelcomeCard(member);
          const attachment = new AttachmentBuilder(imageBuffer, { name: 'welcome.png' });
          sendOptions.files = [attachment];
        } catch (err) {
          console.error(`⚠️ Could not generate welcome card for ${member.user.tag}:`, err.message);
        }
      }

      await channel.send(sendOptions);
    } catch (err) {
      console.error(`⚠️ Error in guildMemberAdd handler for ${member.user.tag}:`, err.message);
    }
  },
};