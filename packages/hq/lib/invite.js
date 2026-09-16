const PERMISSIONS = {
  music: 3231040,
  level: 268520512,
  greet: 268553280,
  ticket: 268553296,
  ping: 84992,
  guard: 268520518,
};

const PERMISSION_LABELS = {
  music: ['View channels', 'Send messages', 'Embed links', 'Read message history', 'Add reactions', 'Connect & speak in voice', 'Priority speaker'],
  level: ['View channels', 'Send messages', 'Embed links', 'Read message history', 'Add reactions', 'Manage roles'],
  greet: ['View channels', 'Send messages', 'Embed links', 'Read message history', 'Add reactions', 'Attach files', 'Manage roles'],
  ticket: ['View channels', 'Send messages', 'Embed links', 'Read message history', 'Add reactions', 'Manage channels', 'Manage roles'],
  ping: ['View channels', 'Send messages', 'Embed links', 'Read message history'],
  guard: ['View channels', 'Send messages', 'Embed links', 'Read message history', 'Add reactions', 'Kick members', 'Ban members', 'Manage roles'],
};

export function getInviteUrl(botId) {
  const id = process.env[`BOT_ID_${botId.toUpperCase()}`];
  if (!id) return null;
  const params = new URLSearchParams({
    client_id: id,
    permissions: String(PERMISSIONS[botId] || 0),
    scope: 'bot applications.commands',
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

export function getPermissionLabels(botId) {
  return PERMISSION_LABELS[botId] || [];
}