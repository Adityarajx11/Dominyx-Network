const pool = require('./db');

let ensured = false;
let ensuring = null;

async function ensureTables() {
  if (!pool.options.connectionString) return;
  if ((await pool.query('SELECT NOW()')).cmd) {}
  const queries = [
    `CREATE TABLE IF NOT EXISTS music_settings (
      guild_id TEXT PRIMARY KEY,
      stay_247 BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `ALTER TABLE music_settings ADD COLUMN IF NOT EXISTS default_volume INTEGER DEFAULT 100`,
    `ALTER TABLE music_settings ADD COLUMN IF NOT EXISTS dj_role_id TEXT`,
    `ALTER TABLE music_settings ADD COLUMN IF NOT EXISTS max_queue INTEGER DEFAULT 50`,
    `ALTER TABLE music_settings ADD COLUMN IF NOT EXISTS leave_timeout_minutes INTEGER DEFAULT 5`,
    `ALTER TABLE music_settings ADD COLUMN IF NOT EXISTS announce_channel_id TEXT`,
    `CREATE TABLE IF NOT EXISTS level_config (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT,
      message_template TEXT
    )`,
    `ALTER TABLE level_config ADD COLUMN IF NOT EXISTS xp_min INTEGER DEFAULT 15`,
    `ALTER TABLE level_config ADD COLUMN IF NOT EXISTS xp_max INTEGER DEFAULT 25`,
    `ALTER TABLE level_config ADD COLUMN IF NOT EXISTS cooldown_seconds INTEGER DEFAULT 60`,
    `ALTER TABLE level_config ADD COLUMN IF NOT EXISTS ignored_channels JSONB DEFAULT '[]'`,
    `ALTER TABLE level_config ADD COLUMN IF NOT EXISTS ignored_roles JSONB DEFAULT '[]'`,
    `ALTER TABLE level_config ADD COLUMN IF NOT EXISTS role_stack BOOLEAN DEFAULT true`,
    `CREATE TABLE IF NOT EXISTS level_roles (
      guild_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      role_id TEXT NOT NULL,
      PRIMARY KEY (guild_id, level)
    )`,
    `CREATE TABLE IF NOT EXISTS greet_settings (
      guild_id TEXT PRIMARY KEY,
      welcome_channel_id TEXT,
      welcome_message TEXT,
      auto_role_id TEXT,
      card_enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `ALTER TABLE greet_settings ADD COLUMN IF NOT EXISTS goodbye_channel_id TEXT`,
    `ALTER TABLE greet_settings ADD COLUMN IF NOT EXISTS goodbye_message TEXT`,
    `ALTER TABLE greet_settings ADD COLUMN IF NOT EXISTS dm_welcome BOOLEAN DEFAULT false`,
    `ALTER TABLE greet_settings ADD COLUMN IF NOT EXISTS card_theme TEXT DEFAULT 'crimson'`,
    `ALTER TABLE greet_settings ADD COLUMN IF NOT EXISTS greet_bots BOOLEAN DEFAULT false`,
    `CREATE TABLE IF NOT EXISTS ticket_config (
      guild_id TEXT PRIMARY KEY,
      category_channel_id TEXT,
      log_channel_id TEXT,
      staff_role_id TEXT,
      max_tickets_per_user INTEGER DEFAULT 1,
      categories JSONB DEFAULT '[]'
    )`,
    `ALTER TABLE ticket_config ADD COLUMN IF NOT EXISTS banner_url TEXT`,
    `ALTER TABLE ticket_config ADD COLUMN IF NOT EXISTS inactive_close_hours INTEGER DEFAULT 0`,
    `ALTER TABLE ticket_config ADD COLUMN IF NOT EXISTS dm_close BOOLEAN DEFAULT false`,
    `ALTER TABLE ticket_config ADD COLUMN IF NOT EXISTS panel_title TEXT`,
    `ALTER TABLE ticket_config ADD COLUMN IF NOT EXISTS panel_rules TEXT`,
    `CREATE TABLE IF NOT EXISTS ping_settings (
      guild_id TEXT PRIMARY KEY,
      youtube_channel_id TEXT,
      live_alert_channel_id TEXT,
      enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `ALTER TABLE ping_settings ADD COLUMN IF NOT EXISTS alert_message TEXT`,
    `ALTER TABLE ping_settings ADD COLUMN IF NOT EXISTS mention_role_id TEXT`,
    `ALTER TABLE ping_settings ADD COLUMN IF NOT EXISTS poll_minutes INTEGER DEFAULT 10`,
    `CREATE TABLE IF NOT EXISTS guard_settings (
      guild_id TEXT PRIMARY KEY,
      modlog_channel_id TEXT,
      self_role_categories JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `ALTER TABLE guard_settings ADD COLUMN IF NOT EXISTS automod_spam BOOLEAN DEFAULT false`,
    `ALTER TABLE guard_settings ADD COLUMN IF NOT EXISTS spam_threshold INTEGER DEFAULT 5`,
    `ALTER TABLE guard_settings ADD COLUMN IF NOT EXISTS spam_seconds INTEGER DEFAULT 10`,
    `ALTER TABLE guard_settings ADD COLUMN IF NOT EXISTS automod_links BOOLEAN DEFAULT false`,
    `ALTER TABLE guard_settings ADD COLUMN IF NOT EXISTS automod_caps BOOLEAN DEFAULT false`,
    `ALTER TABLE guard_settings ADD COLUMN IF NOT EXISTS caps_threshold INTEGER DEFAULT 70`,
    `ALTER TABLE guard_settings ADD COLUMN IF NOT EXISTS mute_role_id TEXT`,
    `ALTER TABLE guard_settings ADD COLUMN IF NOT EXISTS warns_mute INTEGER DEFAULT 3`,
    `ALTER TABLE guard_settings ADD COLUMN IF NOT EXISTS warns_ban INTEGER DEFAULT 5`,
  ];
  for (const q of queries) {
    await pool.query(q);
  }
}

function ensureTablesOnce() {
  if (ensured) return Promise.resolve();
  if (!ensuring) ensuring = ensureTables().then(() => { ensured = true; }).catch((e) => { ensuring = null; throw e; });
  return ensuring;
}

async function querySafe(sql, params) {
  try {
    const res = await pool.query(sql, params);
    return res.rows;
  } catch (err) {
    if (err.code === '3D000' || err.code === '42P01' || !pool.options.connectionString) return [];
    throw err;
  }
}

async function readConfigs(guildId) {
  await ensureTablesOnce().catch(() => {});

  const [music, levelCfg, levelRoles, greet, ticket, ping, guard] = await Promise.all([
    querySafe('SELECT * FROM music_settings WHERE guild_id = $1', [guildId]),
    querySafe('SELECT * FROM level_config WHERE guild_id = $1', [guildId]),
    querySafe('SELECT * FROM level_roles WHERE guild_id = $1 ORDER BY level ASC', [guildId]),
    querySafe('SELECT * FROM greet_settings WHERE guild_id = $1', [guildId]),
    querySafe('SELECT * FROM ticket_config WHERE guild_id = $1', [guildId]),
    querySafe('SELECT * FROM ping_settings WHERE guild_id = $1', [guildId]),
    querySafe('SELECT * FROM guard_settings WHERE guild_id = $1', [guildId]),
  ]);

  return {
    music: {
      stay247: music[0]?.stay_247 ?? false,
      defaultVolume: music[0]?.default_volume ?? 100,
      djRoleId: music[0]?.dj_role_id || null,
      maxQueue: music[0]?.max_queue ?? 50,
      leaveTimeoutMinutes: music[0]?.leave_timeout_minutes ?? 5,
      announceChannelId: music[0]?.announce_channel_id || null,
    },
    level: {
      channel_id: levelCfg[0]?.channel_id || null,
      message_template: levelCfg[0]?.message_template || '🎉 {user} leveled up to **Level {level}**!',
      roles: levelRoles.map((r) => ({ level: r.level, role_id: r.role_id })),
      xp_min: levelCfg[0]?.xp_min ?? 15,
      xp_max: levelCfg[0]?.xp_max ?? 25,
      cooldown_seconds: levelCfg[0]?.cooldown_seconds ?? 60,
      ignored_channels: levelCfg[0]?.ignored_channels || [],
      ignored_roles: levelCfg[0]?.ignored_roles || [],
      role_stack: levelCfg[0]?.role_stack ?? true,
    },
    greet: {
      welcome_channel_id: greet[0]?.welcome_channel_id || null,
      welcome_message: greet[0]?.welcome_message || '🚀 {user} just landed in {server}! We\'re now {membercount} members strong.',
      auto_role_id: greet[0]?.auto_role_id || null,
      card_enabled: greet[0]?.card_enabled ?? true,
      goodbye_channel_id: greet[0]?.goodbye_channel_id || null,
      goodbye_message: greet[0]?.goodbye_message || '👋 **{user}** just left {server}. We\'ll miss you!',
      dm_welcome: greet[0]?.dm_welcome ?? false,
      card_theme: greet[0]?.card_theme || 'crimson',
      greet_bots: greet[0]?.greet_bots ?? false,
    },
    ticket: {
      category_channel_id: ticket[0]?.category_channel_id || null,
      log_channel_id: ticket[0]?.log_channel_id || null,
      staff_role_id: ticket[0]?.staff_role_id || null,
      max_tickets_per_user: ticket[0]?.max_tickets_per_user ?? 1,
      categories: ticket[0]?.categories || [],
      banner_url: ticket[0]?.banner_url || null,
      inactive_close_hours: ticket[0]?.inactive_close_hours ?? 0,
      dm_close: ticket[0]?.dm_close ?? false,
      panel_title: ticket[0]?.panel_title || null,
      panel_rules: ticket[0]?.panel_rules || null,
    },
    ping: {
      youtube_channel_id: ping[0]?.youtube_channel_id || null,
      live_alert_channel_id: ping[0]?.live_alert_channel_id || null,
      enabled: ping[0]?.enabled ?? true,
      alert_message: ping[0]?.alert_message || null,
      mention_role_id: ping[0]?.mention_role_id || null,
      poll_minutes: ping[0]?.poll_minutes ?? 10,
    },
    guard: {
      modlog_channel_id: guard[0]?.modlog_channel_id || null,
      self_role_categories: guard[0]?.self_role_categories || {},
      automod_spam: guard[0]?.automod_spam ?? false,
      spam_threshold: guard[0]?.spam_threshold ?? 5,
      spam_seconds: guard[0]?.spam_seconds ?? 10,
      automod_links: guard[0]?.automod_links ?? false,
      automod_caps: guard[0]?.automod_caps ?? false,
      caps_threshold: guard[0]?.caps_threshold ?? 70,
      mute_role_id: guard[0]?.mute_role_id || null,
      warns_mute: guard[0]?.warns_mute ?? 3,
      warns_ban: guard[0]?.warns_ban ?? 5,
    },
  };
}

const SETTING_COLUMNS = {
  music: {
    stay247: 'stay_247',
    defaultVolume: 'default_volume',
    djRoleId: 'dj_role_id',
    maxQueue: 'max_queue',
    leaveTimeoutMinutes: 'leave_timeout_minutes',
    announceChannelId: 'announce_channel_id',
  },
  greet: {
    welcomeChannelId: 'welcome_channel_id',
    welcomeMessage: 'welcome_message',
    autoRoleId: 'auto_role_id',
    cardEnabled: 'card_enabled',
    goodbyeChannelId: 'goodbye_channel_id',
    goodbyeMessage: 'goodbye_message',
    dmWelcome: 'dm_welcome',
    cardTheme: 'card_theme',
    greetBots: 'greet_bots',
  },
  level: {
    channelId: 'channel_id',
    messageTemplate: 'message_template',
    xpMin: 'xp_min',
    xpMax: 'xp_max',
    cooldownSeconds: 'cooldown_seconds',
    ignoredChannels: 'ignored_channels',
    ignoredRoles: 'ignored_roles',
    roleStack: 'role_stack',
  },
  ticket: {
    categoryChannelId: 'category_channel_id',
    logChannelId: 'log_channel_id',
    staffRoleId: 'staff_role_id',
    maxTickets: 'max_tickets_per_user',
    bannerUrl: 'banner_url',
    inactiveCloseHours: 'inactive_close_hours',
    dmClose: 'dm_close',
    panelTitle: 'panel_title',
    panelRules: 'panel_rules',
  },
  ping: {
    youtubeChannelId: 'youtube_channel_id',
    alertChannelId: 'live_alert_channel_id',
    enabled: 'enabled',
    alertMessage: 'alert_message',
    mentionRoleId: 'mention_role_id',
    pollMinutes: 'poll_minutes',
  },
  guard: {
    modlogChannelId: 'modlog_channel_id',
    automodSpam: 'automod_spam',
    spamThreshold: 'spam_threshold',
    spamSeconds: 'spam_seconds',
    automodLinks: 'automod_links',
    automodCaps: 'automod_caps',
    capsThreshold: 'caps_threshold',
    muteRoleId: 'mute_role_id',
    warnsMute: 'warns_mute',
    warnsBan: 'warns_ban',
  },
};

async function upsertSettings(table, guildId, mappedFields) {
  const keys = Object.keys(mappedFields);
  if (keys.length === 0) return;
  const cols = ['guild_id', ...keys];
  // JSONB columns need stringified arrays/objects; scalars pass through.
  const values = [guildId, ...keys.map((k) => {
    const v = mappedFields[k];
    return Array.isArray(v) || (v !== null && typeof v === 'object') ? JSON.stringify(v) : v;
  })];
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const upsert = keys.map((k) => `${k} = EXCLUDED.${k}`).join(', ');
  await pool.query(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})
     ON CONFLICT (guild_id) DO UPDATE SET ${upsert}`,
    values
  );
}

async function applyPatch(guildId, { bot, op, data = {} }) {
  await ensureTablesOnce();

  const map = SETTING_COLUMNS[bot];
  if (!map) throw new Error(`Unknown bot: ${bot}`);

  switch (op) {
    case 'settings': {
      const mapped = {};
      for (const [camel, column] of Object.entries(map)) {
        if (camel in data) mapped[column] = data[camel];
      }
      const table = {
        music: 'music_settings',
        greet: 'greet_settings',
        level: 'level_config',
        ticket: 'ticket_config',
        ping: 'ping_settings',
        guard: 'guard_settings',
      }[bot];
      await upsertSettings(table, guildId, mapped);
      return 'settings saved';
    }

    case 'level/addRole': {
      const level = Number(data.level);
      if (!Number.isInteger(level) || level < 1) throw new Error('Level must be a positive integer');
      if (!data.role_id) throw new Error('Role required');
      await pool.query(
        `INSERT INTO level_roles (guild_id, level, role_id) VALUES ($1, $2, $3)
         ON CONFLICT (guild_id, level) DO UPDATE SET role_id = $3`,
        [guildId, level, data.role_id]
      );
      return 'role added';
    }

    case 'level/removeRole': {
      await pool.query('DELETE FROM level_roles WHERE guild_id = $1 AND level = $2', [guildId, Number(data.level)]);
      return 'role removed';
    }

    case 'ticket/addCategory': {
      const cfg = (await querySafe('SELECT categories FROM ticket_config WHERE guild_id = $1', [guildId]))[0];
      const categories = Array.isArray(cfg?.categories) ? [...cfg.categories] : [];
      categories.push({
        label: String(data.label).slice(0, 100),
        emoji: data.emoji || null,
        description: data.description || null,
      });
      await pool.query(
        `INSERT INTO ticket_config (guild_id, categories) VALUES ($1, $2)
         ON CONFLICT (guild_id) DO UPDATE SET categories = $2`,
        [guildId, JSON.stringify(categories)]
      );
      return 'category added';
    }

    case 'ticket/removeCategory': {
      const cfg = (await querySafe('SELECT categories FROM ticket_config WHERE guild_id = $1', [guildId]))[0];
      const categories = Array.isArray(cfg?.categories) ? cfg.categories.filter((c) => c.label !== data.label) : [];
      await pool.query(
        `INSERT INTO ticket_config (guild_id, categories) VALUES ($1, $2)
         ON CONFLICT (guild_id) DO UPDATE SET categories = $2`,
        [guildId, JSON.stringify(categories)]
      );
      return 'category removed';
    }

    case 'guard/addSelfRole': {
      const guard = (await querySafe('SELECT self_role_categories FROM guard_settings WHERE guild_id = $1', [guildId]))[0];
      const categories = { ...(guard?.self_role_categories || {}) };
      const cat = String(data.category).slice(0, 60);
      if (!categories[cat]) categories[cat] = [];
      if (!categories[cat].includes(data.role_id)) categories[cat].push(data.role_id);
      await pool.query(
        `INSERT INTO guard_settings (guild_id, self_role_categories) VALUES ($1, $2)
         ON CONFLICT (guild_id) DO UPDATE SET self_role_categories = $2`,
        [guildId, JSON.stringify(categories)]
      );
      return 'self-role added';
    }

    case 'guard/removeSelfRole': {
      const guard = (await querySafe('SELECT self_role_categories FROM guard_settings WHERE guild_id = $1', [guildId]))[0];
      const categories = { ...(guard?.self_role_categories || {}) };
      for (const [cat, ids] of Object.entries(categories)) {
        if (ids.includes(data.role_id)) {
          categories[cat] = ids.filter((id) => id !== data.role_id);
          if (categories[cat].length === 0) delete categories[cat];
        }
      }
      await pool.query(
        `INSERT INTO guard_settings (guild_id, self_role_categories) VALUES ($1, $2)
         ON CONFLICT (guild_id) DO UPDATE SET self_role_categories = $2`,
        [guildId, JSON.stringify(categories)]
      );
      return 'self-role removed';
    }

    default:
      throw new Error(`Unknown op: ${op}`);
  }
}

module.exports = { readConfigs, applyPatch, ensureTablesOnce };