const { clientId, clientSecret, redirectUri, botToken } = require('./env');

const API = 'https://discord.com/api/v10';

async function discordFetch(path, { token, method = 'GET', body } = {}) {
  const headers = {
    Authorization: token ? `Bearer ${token}` : `Bot ${botToken}`,
    'Content-Type': 'application/json',
  };
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('discord unauthorized');
    const text = await res.text().catch(() => '');
    throw new Error(`discord ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function oauthAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'identify guilds guilds.channels guilds.members.read',
    prompt: 'none',
  });
  if (state) params.set('state', state);
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error('token exchange failed');
  return res.json();
}

async function getUser(token) {
  return discordFetch('/users/@me', { token });
}

async function getUserGuilds(token) {
  try {
    return await discordFetch('/users/@me/guilds', { token });
  } catch {
    return [];
  }
}

async function getBotGuilds() {
  if (!botToken) return new Set();
  const tokens = [
    botToken,
    process.env.BOT_TOKEN_MUSIC,
    process.env.BOT_TOKEN_LEVEL,
    process.env.BOT_TOKEN_GREET,
    process.env.BOT_TOKEN_TICKET,
    process.env.BOT_TOKEN_PING,
    process.env.BOT_TOKEN_GUARD,
  ].filter(Boolean);
  const guilds = new Set();
  for (const token of tokens) {
    try {
      const headers = {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      };
      const res = await fetch(`${API}/users/@me/guilds`, { headers });
      if (res.ok) {
        const list = await res.json();
        for (const g of list) guilds.add(g.id);
      }
    } catch {
      // ignore failed bot lookups
    }
  }
  return guilds;
}

const ADMINISTRATOR = 8n;
const MANAGE_GUILD = 32n;

function canManage(permissions) {
  const bits = BigInt(permissions || 0);
  return (bits & ADMINISTRATOR) === ADMINISTRATOR || (bits & MANAGE_GUILD) === MANAGE_GUILD;
}

async function getGuild(guildId, token) {
  return discordFetch(`/guilds/${guildId}`, { token });
}

async function getGuildChannels(guildId, token) {
  return discordFetch(`/guilds/${guildId}/channels`, { token });
}

async function getGuildRoles(guildId, token) {
  return discordFetch(`/guilds/${guildId}/roles`, { token });
}

async function getGuildMembers(guildId, token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const res = await fetch(`${API}/guilds/${guildId}/members?limit=1000`, { headers });
  if (!res.ok) return [];
  return res.json();
}

const BOT_IDS = {
  music: process.env.BOT_ID_MUSIC,
  level: process.env.BOT_ID_LEVEL,
  greet: process.env.BOT_ID_GREET,
  ticket: process.env.BOT_ID_TICKET,
  ping: process.env.BOT_ID_PING,
  guard: process.env.BOT_ID_GUARD,
};

async function getBotsInGuild(guildId, token) {
  const members = await getGuildMembers(guildId, token);
  const memberIds = new Set(members.map((m) => m.user?.id).filter(Boolean));
  const present = {};
  for (const [botId, clientId] of Object.entries(BOT_IDS)) {
    if (clientId && memberIds.has(clientId)) present[botId] = true;
  }
  return present;
}
module.exports = {
  oauthAuthorizeUrl,
  exchangeCode,
  getUser,
  getUserGuilds,
  getBotGuilds,
  canManage,
  getGuild,
  getGuildChannels,
  getGuildRoles,
  getBotsInGuild,
};