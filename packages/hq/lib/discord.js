const { clientId, clientSecret, redirectUri, botToken } = require('./env');

const API = 'https://discord.com/api/v10';

async function discordFetch(path, { token, bot, method = 'GET', body } = {}) {
  const headers = {
    Authorization: token ? `Bearer ${token}` : `Bot ${bot || botToken}`,
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
  ].filter(Boolean).map((t) => t.trim());
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

async function getGuild(guildId, botOverride) {
  return discordFetch(`/guilds/${guildId}`, { bot: botOverride });
}

async function getGuildChannels(guildId, botOverride) {
  return discordFetch(`/guilds/${guildId}/channels`, { bot: botOverride });
}

async function getGuildRoles(guildId, botOverride) {
  return discordFetch(`/guilds/${guildId}/roles`, { bot: botOverride });
}

async function getBotsInGuild(guildId) {
  const botTokens = {
    music: process.env.BOT_TOKEN_MUSIC,
    level: process.env.BOT_TOKEN_LEVEL,
    greet: process.env.BOT_TOKEN_GREET,
    ticket: process.env.BOT_TOKEN_TICKET,
    ping: process.env.BOT_TOKEN_PING,
    guard: process.env.BOT_TOKEN_GUARD,
  };
  const present = {};
  const checks = Object.entries(botTokens).map(async ([botId, bToken]) => {
    if (!bToken) return;
    const clean = bToken.trim();
    try {
      const headers = { Authorization: `Bot ${clean}`, 'Content-Type': 'application/json' };
      const res = await fetch(`${API}/users/@me/guilds`, { headers });
      if (!res.ok) return;
      const guilds = await res.json();
      if (guilds.some((g) => g.id === guildId)) present[botId] = true;
    } catch {}
  });
  await Promise.all(checks);
  return Object.keys(present).length > 0 ? present : null;
}

const BOT_TOKEN_MAP = {
  music: () => process.env.BOT_TOKEN_MUSIC,
  level: () => process.env.BOT_TOKEN_LEVEL,
  greet: () => process.env.BOT_TOKEN_GREET,
  ticket: () => process.env.BOT_TOKEN_TICKET,
  ping: () => process.env.BOT_TOKEN_PING,
  guard: () => process.env.BOT_TOKEN_GUARD,
};

// Returns a bot token that is in the given guild (for reading channels/roles).
// Tries each bot token directly against the guild — most reliable check.
async function getGuildBotToken(guildId) {
  const botTokens = [
    ['music', process.env.BOT_TOKEN_MUSIC],
    ['level', process.env.BOT_TOKEN_LEVEL],
    ['greet', process.env.BOT_TOKEN_GREET],
    ['ticket', process.env.BOT_TOKEN_TICKET],
    ['ping', process.env.BOT_TOKEN_PING],
    ['guard', process.env.BOT_TOKEN_GUARD],
  ];
  for (const [, bToken] of botTokens) {
    if (!bToken) continue;
    try {
      const res = await fetch(`${API}/guilds/${guildId}`, {
        headers: { Authorization: `Bot ${bToken.trim()}` },
      });
      if (res.ok) return bToken.trim();
    } catch {}
  }
  return botToken;
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
  getGuildBotToken,
};