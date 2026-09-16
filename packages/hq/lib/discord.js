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
    scope: 'identify guilds',
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
  try {
    const guilds = await discordFetch('/users/@me/guilds', {});
    return new Set(guilds.map((g) => g.id));
  } catch {
    return new Set();
  }
}

const ADMINISTRATOR = 8n;
const MANAGE_GUILD = 32n;

function canManage(permissions) {
  const bits = BigInt(permissions || 0);
  return (bits & ADMINISTRATOR) === ADMINISTRATOR || (bits & MANAGE_GUILD) === MANAGE_GUILD;
}

async function getGuild(guildId) {
  return discordFetch(`/guilds/${guildId}`, {});
}

async function getGuildChannels(guildId) {
  return discordFetch(`/guilds/${guildId}/channels`, {});
}

async function getGuildRoles(guildId) {
  return discordFetch(`/guilds/${guildId}/roles`, {});
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
};