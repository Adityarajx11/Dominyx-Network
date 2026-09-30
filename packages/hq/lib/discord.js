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
  return discordFetch('/users/@me/guilds', { token });
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

// botId -> Set<guildId> for every bot that has a token. One /users/@me/guilds call per bot.
async function getBotsGuildMap() {
  const botTokens = {
    music: process.env.BOT_TOKEN_MUSIC,
    level: process.env.BOT_TOKEN_LEVEL,
    greet: process.env.BOT_TOKEN_GREET,
    ticket: process.env.BOT_TOKEN_TICKET,
    ping: process.env.BOT_TOKEN_PING,
    guard: process.env.BOT_TOKEN_GUARD,
  };
  const map = {};
  const jobs = Object.entries(botTokens).map(async ([botId, bToken]) => {
    if (!bToken) return;
    const clean = bToken.trim();
    if (!clean) return;
    try {
      const headers = { Authorization: `Bot ${clean}`, 'Content-Type': 'application/json' };
      const res = await fetch(`${API}/users/@me/guilds`, { headers });
      if (!res.ok) return;
      const guilds = await res.json();
      map[botId] = new Set(guilds.map((g) => g.id));
    } catch {}
  });
  await Promise.all(jobs);
  return map;
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
// All tokens are probed in PARALLEL (sequential probing added seconds per load),
// and the winner is cached per guild for 5 minutes.
const guildTokenCache = new Map(); // guildId -> { token, at }

async function getGuildBotToken(guildId) {
  const cached = guildTokenCache.get(guildId);
  if (cached && Date.now() - cached.at < 5 * 60 * 1000) return cached.token;

  const botTokens = [
    process.env.BOT_TOKEN_MUSIC,
    process.env.BOT_TOKEN_LEVEL,
    process.env.BOT_TOKEN_GREET,
    process.env.BOT_TOKEN_TICKET,
    process.env.BOT_TOKEN_PING,
    process.env.BOT_TOKEN_GUARD,
  ].filter(Boolean).map((t) => t.trim()).filter(Boolean);

  const probes = botTokens.map(async (clean) => {
    const res = await fetch(`${API}/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${clean}` },
    }).catch(() => null);
    if (res && res.ok) return clean;
    throw new Error('nope');
  });

  let winner = null;
  try {
    winner = await Promise.any(probes);
  } catch {
    winner = null;
  }
  const token = winner || botToken;
  guildTokenCache.set(guildId, { token, at: Date.now() });
  if (guildTokenCache.size > 500) {
    const oldest = guildTokenCache.keys().next().value;
    guildTokenCache.delete(oldest);
  }
  return token;
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
  getBotsGuildMap,
  getGuildBotToken,
};