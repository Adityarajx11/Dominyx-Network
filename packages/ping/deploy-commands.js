require('dotenv').config();
const path = require('path');
const { deployCommands } = require('@dominyx/core');

deployCommands(path.join(__dirname, 'commands'))
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Deploy failed:', err);
    process.exit(1);
  });