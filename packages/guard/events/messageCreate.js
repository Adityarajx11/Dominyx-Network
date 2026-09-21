const { getGuardSettings } = require('./guardStore');
const { createCase, logCaseToChannel } = require('./modlog');

const LINK_RE = /https?:\/\/|discord\.gg\/|discord\.com\/invite\//i;

// Sliding message timestamps per guild+user for spam detection.
const windows = new Map(); // `${guildId}:${userId}` -> number[]

function pruneTimestamps(key, windowMs) {
  const now = Date.now();
  const list = (windows.get(key) || []).filter((t) => now - t < windowMs);
  windows.set(key, list);
  if (windows.size > 5000) {
    const oldest = windows.keys().next().value;
    windows.delete(oldest);
  }
  return list;
}

function capsPercent(text) {
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  if (letters < 10) return 0;
  const upper = (text.match(/[A-Z]/g) || []).length;
  return Math.round((upper / letters) * 100);
}

async function handleAutomodMute(client, message, reason) {
  const settings = await getGuardSettings(message.guild.id).catch(() => null);
  const muteRoleId = settings?.mute_role_id;
  const member = message.member;
  if (!muteRoleId || !member) return false;
  const role = message.guild.roles.cache.get(muteRoleId);
  if (!role || member.roles.cache.has(role.id)) return false;
  try {
    await member.roles.add(role, `Automod: ${reason}`);
    await createCase({
      guildId: message.guild.id,
      action: 'automod_mute',
      targetId: member.id,
      targetTag: member.user.tag,
      moderatorId: client.user.id,
      moderatorTag: client.user.tag,
      reason: `Automod: ${reason}`,
    }).catch(() => {});
    await logCaseToChannel(client, message.guild.id, {
      action: 'automod_mute',
      targetTag: member.user.tag,
      targetId: member.id,
      moderatorTag: client.user.tag,
      reason: `Automod: ${reason}`,
      caseNumber: null,
    }).catch(() => {});
    return true;
  } catch (err) {
    console.warn(`Automod mute failed for ${member.user.tag}:`, err.message);
    return false;
  }
}

async function warnAndDelete(message, text) {
  try {
    await message.delete().catch(() => {});
    const warning = await message.channel.send(`${message.author}, ${text}`).catch(() => null);
    if (warning) setTimeout(() => warning.delete().catch(() => {}), 5000);
  } catch {}
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    try {
      if (!message.guild || message.author.bot) return;
      // Staff and moderators are exempt.
      if (message.member?.permissions?.has?.('ManageMessages')) return;

      const settings = await getGuardSettings(message.guild.id).catch(() => null);
      if (!settings) return;
      const content = message.content || '';

      // Spam: N messages inside M seconds.
      if (settings.automod_spam) {
        const threshold = Number.isInteger(settings.spam_threshold) ? settings.spam_threshold : 5;
        const windowSec = Number.isInteger(settings.spam_seconds) ? settings.spam_seconds : 10;
        const key = `${message.guild.id}:${message.author.id}`;
        const list = pruneTimestamps(key, windowSec * 1000);
        list.push(Date.now());
        windows.set(key, list);
        if (list.length >= threshold) {
          windows.set(key, []);
          await message.channel.send(`${message.author}, slow down — no spamming.`).catch(() => null);
          const muted = await handleAutomodMute(client, message, `spam (${list.length} msgs/${windowSec}s)`);
          const toDelete = await message.channel.messages.fetch({ limit: Math.min(list.length, 10) }).catch(() => null);
          if (toDelete) {
            const mine = toDelete.filter((m) => m.author.id === message.author.id);
            await message.channel.bulkDelete(mine, true).catch(() => message.delete().catch(() => {}));
          }
          if (muted) await message.channel.send(`${message.author} was muted for spamming.`).catch(() => null);
          return;
        }
      }

      // Links.
      if (settings.automod_links && LINK_RE.test(content)) {
        await warnAndDelete(message, 'links aren\u2019t allowed here.');
        return;
      }

      // Caps.
      if (settings.automod_caps) {
        const threshold = Number.isInteger(settings.caps_threshold) ? settings.caps_threshold : 70;
        if (capsPercent(content) >= threshold) {
          await warnAndDelete(message, 'please turn off caps lock.');
          return;
        }
      }
    } catch (err) {
      console.error('Automod error:', err.message);
    }
  },
};
