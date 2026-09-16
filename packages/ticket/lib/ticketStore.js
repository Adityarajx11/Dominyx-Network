const { pool } = require('@dominyx/core');

async function initTicketTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ticket_config (
      guild_id TEXT PRIMARY KEY,
      category_channel_id TEXT,
      log_channel_id TEXT,
      staff_role_id TEXT,
      max_tickets_per_user INTEGER DEFAULT 1,
      categories JSONB DEFAULT '[]'
    );
  `);
  await pool.query(`ALTER TABLE ticket_config ADD COLUMN IF NOT EXISTS banner_url TEXT;`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      category TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      claimed_by TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      closed_at TIMESTAMP
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ticket_transcripts (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER REFERENCES tickets(id),
      content TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('🎫 Ticket tables ready.');
}

async function getConfig(guildId) {
  const res = await pool.query('SELECT * FROM ticket_config WHERE guild_id = $1', [guildId]);
  return res.rows[0] || null;
}

async function setConfig(guildId, fields = {}) {
  const allowed = ['category_channel_id', 'log_channel_id', 'staff_role_id', 'max_tickets_per_user', 'categories', 'banner_url'];
  const keys = Object.keys(fields).filter(k => allowed.includes(k));
  if (keys.length === 0) return getConfig(guildId);

  const cols = ['guild_id', ...keys];
  const values = [guildId, ...keys.map(k => (k === 'categories' ? JSON.stringify(fields[k]) : fields[k]))];
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const updateClause = keys.map(k => `${k} = EXCLUDED.${k}`).join(', ');

  await pool.query(
    `INSERT INTO ticket_config (${cols.join(', ')}) VALUES (${placeholders.join(', ')})
     ON CONFLICT (guild_id) DO UPDATE SET ${updateClause}`,
    values
  );
  return getConfig(guildId);
}

async function getOpenTicketCountForUser(guildId, userId) {
  const res = await pool.query(
    `SELECT COUNT(*)::int AS count FROM tickets WHERE guild_id = $1 AND user_id = $2 AND status = 'open'`,
    [guildId, userId]
  );
  return res.rows[0].count;
}

async function createTicket(guildId, channelId, userId, category = null) {
  const res = await pool.query(
    `INSERT INTO tickets (guild_id, channel_id, user_id, category) VALUES ($1, $2, $3, $4) RETURNING *`,
    [guildId, channelId, userId, category]
  );
  return res.rows[0];
}

async function getTicketByChannel(channelId) {
  const res = await pool.query('SELECT * FROM tickets WHERE channel_id = $1', [channelId]);
  return res.rows[0] || null;
}

async function claimTicket(ticketId, staffUserId) {
  const res = await pool.query(
    `UPDATE tickets SET claimed_by = $2, status = 'claimed' WHERE id = $1 RETURNING *`,
    [ticketId, staffUserId]
  );
  return res.rows[0] || null;
}

async function setPriority(ticketId, priority) {
  const res = await pool.query(
    `UPDATE tickets SET priority = $2 WHERE id = $1 RETURNING *`,
    [ticketId, priority]
  );
  return res.rows[0] || null;
}

async function closeTicket(ticketId) {
  const res = await pool.query(
    `UPDATE tickets SET status = 'closed', closed_at = NOW() WHERE id = $1 RETURNING *`,
    [ticketId]
  );
  return res.rows[0] || null;
}

async function saveTranscript(ticketId, content) {
  await pool.query(
    `INSERT INTO ticket_transcripts (ticket_id, content) VALUES ($1, $2)`,
    [ticketId, content]
  );
}

module.exports = {
  initTicketTables,
  getConfig,
  setConfig,
  getOpenTicketCountForUser,
  createTicket,
  getTicketByChannel,
  claimTicket,
  setPriority,
  closeTicket,
  saveTranscript,
};