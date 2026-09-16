const { getSessionToken } = require('./session');
const { getUser, getUserGuilds, getBotGuilds, canManage } = require('./discord');

async function getSession() {
  const token = getSessionToken();
  if (!token) return null;
  const user = await getUser(token).catch(() => null);
  if (!user) return null;
  return { token, user };
}

async function getAuthedData() {
  const session = await getSession();
  if (!session) return null;

  const [userGuilds, botGuilds] = await Promise.all([getUserGuilds(session.token), getBotGuilds()]);
  const manageable = userGuilds.filter((g) => canManage(g.permissions));

  return {
    token: session.token,
    user: session.user,
    userGuilds,
    botGuilds,
    manageable,
  };
}

async function requireApiAuth() {
  const data = await getAuthedData();
  if (!data) {
    const err = new Error('Not authenticated');
    err.status = 401;
    throw err;
  }
  return data;
}

async function requireGuildAccess(guildId) {
  const data = await requireApiAuth();
  const guild = data.manageable.find((g) => g.id === guildId);
  if (!guild) {
    const err = new Error('You don\'t have permission to manage this server');
    err.status = 403;
    throw err;
  }
  const hasBot = data.botGuilds.has(guildId);
  return { user: data.user, guild, hasBot, token: data.token };
}

module.exports = { getSession, getAuthedData, requireApiAuth, requireGuildAccess };