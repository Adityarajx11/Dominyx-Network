function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

module.exports = {
  clientId: process.env.DISCORD_CLIENT_ID || null,
  clientSecret: process.env.DISCORD_CLIENT_SECRET || null,
  redirectUri: process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/callback',
  botToken: process.env.BOT_TOKEN || null,
  databaseUrl: process.env.DATABASE_URL || null,
  appUrl: process.env.PUBLIC_APP_URL || 'http://localhost:3000',
  required,
};