function xpForLevel(level) {
  return 5 * (level * level) + (50 * level) + 100;
}

function calculateLevelUp(currentXp, currentLevel, addedXp) {
  let xp = currentXp + addedXp;
  let level = currentLevel;
  let levelsGained = 0;

  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level++;
    levelsGained++;
  }

  return { xp, level, levelsGained };
}

const cooldowns = new Map();

function isOnCooldown(guildId, userId, cooldownMs = 60000) {
  const key = `${guildId}:${userId}`;
  const last = cooldowns.get(key);
  const now = Date.now();

  if (last && now - last < cooldownMs) return true;

  cooldowns.set(key, now);
  return false;
}

module.exports = { xpForLevel, calculateLevelUp, isOnCooldown };