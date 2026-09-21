const { createCanvas, loadImage } = require('@napi-rs/canvas');

const SHADOW = 'rgb(8, 5, 6)';

const THEMES = {
  crimson: { rgb: [220, 20, 60], dark: 'rgb(120, 12, 34)', mid: 'rgb(20, 10, 14)' },
  gold: { rgb: [212, 175, 55], dark: 'rgb(110, 85, 20)', mid: 'rgb(20, 16, 8)' },
  violet: { rgb: [139, 92, 246], dark: 'rgb(70, 45, 130)', mid: 'rgb(14, 10, 24)' },
  ocean: { rgb: [59, 130, 246], dark: 'rgb(25, 60, 130)', mid: 'rgb(8, 12, 22)' },
};

function rgba(rgb, a) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
}

function rgbStr(rgb) {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

async function generateWelcomeCard(member, themeName = 'crimson') {
  const theme = THEMES[themeName] || THEMES.crimson;
  const MAIN = rgbStr(theme.rgb);

  const canvas = createCanvas(1000, 350);
  const ctx = canvas.getContext('2d');

  // Themed background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 350);
  gradient.addColorStop(0, SHADOW);
  gradient.addColorStop(0.6, theme.mid);
  gradient.addColorStop(1, MAIN);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1000, 350);

  // Glow behind the avatar
  const glowCenterX = 100;
  const glowCenterY = 300;
  for (let i = 200; i > 0; i -= 20) {
    const opacity = (1 - i / 200) * 0.35;
    ctx.fillStyle = rgba(theme.rgb, opacity);
    ctx.beginPath();
    ctx.arc(glowCenterX, glowCenterY, i, 0, Math.PI * 2);
    ctx.fill();
  }

  // Diagonal accent stripes across the right side
  ctx.strokeStyle = rgba(theme.rgb, 0.25);
  ctx.lineWidth = 2;
  for (let x = 700; x < 1100; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 250, 350);
    ctx.stroke();
  }

  // Circular member avatar
  let avatarImage = null;
  try {
    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    avatarImage = await loadImage(avatarUrl);
  } catch {
    // fallback below
  }

  const avatarX = 90;
  const avatarY = 175;
  const avatarRadius = 80;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
  ctx.clip();
  if (avatarImage) {
    ctx.drawImage(avatarImage, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
  } else {
    ctx.fillStyle = theme.dark;
    ctx.fillRect(avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
  }
  ctx.restore();

  // Ring around avatar
  ctx.strokeStyle = MAIN;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 7, 0, Math.PI * 2);
  ctx.stroke();

  const textStartX = 250;

  // "WELCOME" title
  ctx.font = 'bold 54px Inter Bold';
  ctx.fillStyle = MAIN;
  ctx.textBaseline = 'top';
  ctx.fillText('WELCOME', textStartX, 100);

  // Member username
  ctx.font = '30px Inter Bold';
  ctx.fillStyle = 'rgb(255, 255, 255)';
  ctx.fillText(member.user.username, textStartX, 162);

  // "to {guild name}"
  ctx.font = '24px Inter';
  ctx.fillStyle = 'rgb(200, 200, 205)';
  ctx.fillText(`to ${member.guild.name}`, textStartX, 204);

  // Badge (member count)
  const badgeX = 740;
  const badgeY = 280;
  const badgeWidth = 230;
  const badgeHeight = 50;
  const badgeRadius = 10;

  ctx.strokeStyle = MAIN;
  ctx.lineWidth = 2;
  ctx.fillStyle = rgba(theme.rgb, 0.15);
  ctx.beginPath();
  ctx.moveTo(badgeX + badgeRadius, badgeY);
  ctx.lineTo(badgeX + badgeWidth - badgeRadius, badgeY);
  ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + badgeRadius);
  ctx.lineTo(badgeX + badgeWidth, badgeY + badgeHeight - badgeRadius);
  ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX + badgeWidth - badgeRadius, badgeY + badgeHeight);
  ctx.lineTo(badgeX + badgeRadius, badgeY + badgeHeight);
  ctx.quadraticCurveTo(badgeX, badgeY + badgeHeight, badgeX, badgeY + badgeHeight - badgeRadius);
  ctx.lineTo(badgeX, badgeY + badgeRadius);
  ctx.quadraticCurveTo(badgeX, badgeY, badgeX + badgeRadius, badgeY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const badgeText = `MEMBER #${member.guild.memberCount}`;
  ctx.font = 'bold 20px Inter Bold';
  ctx.fillStyle = MAIN;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);

  return canvas.toBuffer('image/png');
}

module.exports = { generateWelcomeCard, THEMES: Object.keys(THEMES) };
