const { getGreetSettings } = require('../lib/settings');

const DEFAULT_GOODBYE = '👋 **{user}** just left {server}. We\'ll miss you!';

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    try {
      const settings = await getGreetSettings(member.guild.id);
      if (!settings.goodbyeChannelId) return;
      if (member.user.bot && !settings.greetBots) return;

      const channel = member.guild.channels.cache.get(settings.goodbyeChannelId);
      if (!channel) return;

      const template = settings.goodbyeMessage || DEFAULT_GOODBYE;
      const text = template
        .replaceAll('{user}', member.user?.username || 'Someone')
        .replaceAll('{username}', member.user?.username || 'Someone')
        .replaceAll('{server}', member.guild.name)
        .replaceAll('{membercount}', String(member.guild.memberCount));

      await channel.send({ content: text }).catch(() => {});
    } catch (err) {
      console.error(`⚠️ Error in guildMemberRemove handler in "${member.guild?.name}":`, err.message);
    }
  },
};
