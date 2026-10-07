const path = require('path');
// Load this bot's own .env first — cwd is the repo root when run via workspaces.
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
const { deployCommands } = require('@dominyx/core');

deployCommands(path.join(__dirname, 'commands'))
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Deploy failed:', err);
    process.exit(1);
  });