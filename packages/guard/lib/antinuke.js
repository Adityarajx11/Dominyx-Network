const { getGuardSettings } = require('./guardStore');

// Sliding-window counters per guild+key for anti-nuke detection.
// Kept in memory; a restart resets windows (safe default: no false alarms).
const hits = new Map(); // `${guildId}:${kind}` -> number[]

function recordHit(guildId, kind, windowMs) {
  const now = Date.now();
  const key = `${guildId}:${kind}`;
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 2000) {
    const oldest = hits.keys().next().value;
    hits.delete(oldest);
  }
  return list.length;
}

async function alertModlog(client, guildId, title, description) {
  try {
    const settings = await getGuardSettings(guildId).catch(() => null);
    if (!settings?.modlog_channel_id) return;
    const channel = client.channels.cache.get(settings.modlog_channel_id)
      ?? await client.channels.fetch(settings.modlog_channel_id).catch(() => null);
    if (!channel?.isTextBased?.()) return;
    await channel.send(`🚨 **${title}**\n${description}`).catch(() => {});
  } catch {}
}

// Returns the audit-log executor (who did it) when the bot can see it.
async function findExecutor(guild, actionType) {
  try {
    const logs = await guild.fetchAuditLogs({ type: actionType, limit: 3 }).catch(() => null);
    const entry = logs?.entries?.first();
    if (entry && Date.now() - entry.createdTimestamp < 15000) return entry.executor;
  } catch {}
  return null;
}

// Recreate a deleted channel from its snapshot. Returns the new channel or null.
async function rollbackChannel(guild, channel) {
  try {
    const overwrites = [];
    try {
      for (const ow of channel.permissionOverwrites.cache.values()) {
        overwrites.push({ id: ow.id, allow: ow.allow.bitfield.toString(), deny: ow.deny.bitfield.toString() });
      }
    } catch {}
    const data = {
      name: channel.name,
      type: channel.type,
      reason: 'Guard anti-nuke rollback',
    };
    if (channel.parentId) data.parent = channel.parentId;
    if (Number.isInteger(channel.position)) data.position = channel.position;
    if (overwrites.length > 0) data.permissionOverwrites = overwrites;
    if (channel.topic !== undefined) data.topic = channel.topic;
    if (channel.nsfw !== undefined) data.nsfw = channel.nsfw;
    if (Number.isInteger(channel.rateLimitPerUser)) data.rateLimitPerUser = channel.rateLimitPerUser;
    if (Number.isInteger(channel.defaultAutoArchiveDuration)) data.defaultAutoArchiveDuration = channel.defaultAutoArchiveDuration;
    return await guild.channels.create(data);
  } catch (err) {
    console.warn(`Rollback failed for #${channel.name || channel.id}:`, err.message);
    return null;
  }
}

// Recreate a deleted role from its snapshot. Returns the new role or null.
async function rollbackRole(guild, role) {
  try {
    const me = guild.members.me;
    const maxPos = me ? me.roles.highest.position - 1 : 0;
    const data = {
      name: role.name,
      color: role.color,
      hoist: role.hoist,
      mentionable: role.mentionable,
      permissions: role.permissions.bitfield,
      reason: 'Guard anti-nuke rollback',
    };
    if (Number.isInteger(role.position) && role.position <= maxPos) data.position = role.position;
    return await guild.roles.create(data);
  } catch (err) {
    console.warn(`Rollback failed for @${role.name || role.id}:`, err.message);
    return null;
  }
}

// Snapshots of recently deleted channels/roles for burst rollback.
// guildId -> [{ kind: 'channel'|'role', at, restore: async () => bool }]
const stash = new Map();

function stashSnapshot(guildId, entry) {
  const list = stash.get(guildId) || [];
  list.push({ ...entry, at: Date.now() });
  while (list.length > 6) list.shift();
  stash.set(guildId, list);
}

// Roll back stashed deletes of one kind in the last 60s. Returns restored count.
async function rollbackBurst(guild, client, guildId, kind) {
  const now = Date.now();
  const list = (stash.get(guildId) || []).filter((e) => now - e.at < 60000 && (!kind || e.kind === kind));
  stash.set(guildId, (stash.get(guildId) || []).filter((e) => now - e.at >= 60000 || (kind && e.kind !== kind)));
  let restored = 0;
  for (const entry of list) {
    try {
      if (entry.kind === 'channel') {
        const created = await rollbackChannel(guild, entry.data);
        if (created) restored++;
      } else {
        const created = await rollbackRole(guild, entry.data);
        if (created) restored++;
      }
    } catch {}
  }
  return restored;
}
async function punishNuker(guild, executor, action) {
  if (!executor || executor.bot) return false;
  try {
    if (executor.id === guild.ownerId) return false;
    const me = guild.members.me;
    if (action === 'ban' && !me?.permissions?.has?.('BanMembers')) return false;
    if (action !== 'ban' && !me?.permissions?.has?.('ModerateMembers')) return false;
    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (!member) return false;
    if (!member.manageable) return false;
    if (action === 'ban') {
      await member.ban({ reason: 'Guard anti-nuke: mass destruction detected' });
    } else {
      await member.timeout(60 * 60 * 1000, 'Guard anti-nuke: mass destruction detected');
    }
    return true;
  } catch {
    return false;
  }
}

module.exports = { recordHit, alertModlog, findExecutor, rollbackChannel, rollbackRole, punishNuker, stashSnapshot, rollbackBurst };
