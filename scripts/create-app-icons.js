/**
 * Creates PWA app icons for Shot On Me
 * Uses the app's color scheme: Soft gold (#B8945A) on black background
 * Uses Dancing Script font for the cursive "Shot On Me" logo
 */

const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// Colors from the app
const GOLD_COLOR = '#B8945A'; // Soft, pale gold
const BLACK_COLOR = '#000000'; // Black background
const GOLD_LIGHT = '#C9A875'; // Lighter gold for accents

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const publicDir = path.join(__dirname, '..', 'public');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('🎨 Creating Shot On Me App Icons');
console.log('=================================\n');
console.log(`Color: ${GOLD_COLOR} (Soft Gold)`);
console.log(`Background: ${BLACK_COLOR} (Black)`);
console.log(`Font: Dancing Script (Cursive)\n`);

async function createIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Fill background with black
  ctx.fillStyle = BLACK_COLOR;
  ctx.fillRect(0, 0, size, size);

  // Set text properties
  const fontSize = Math.floor(size * 0.35); // Responsive font size
  ctx.fillStyle = GOLD_COLOR;
  ctx.font = `bold ${fontSize}px "Dancing Script", cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Add subtle glow effect for elegance
  ctx.shadowColor = GOLD_COLOR;
  ctx.shadowBlur = size * 0.05;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Draw "Shot On Me" text
  const text = 'Shot On Me';
  const centerX = size / 2;
  const centerY = size / 2;

  // For larger icons, add a subtle decorative element
  if (size >= 192) {
    // Add a subtle gold border/ring
    ctx.strokeStyle = GOLD_COLOR;
    ctx.lineWidth = size * 0.01;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, size * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  // Draw main text
  ctx.fillText(text, centerX, centerY);

  // For very large icons, add a subtle accent
  if (size >= 384) {
    // Add small decorative dots or accents
    ctx.fillStyle = GOLD_LIGHT;
    ctx.globalAlpha = 0.4;
    const dotSize = size * 0.02;
    ctx.beginPath();
    ctx.arc(centerX - size * 0.25, centerY - size * 0.15, dotSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + size * 0.25, centerY - size * 0.15, dotSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  // Save the icon
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(publicDir, `icon-${size}x${size}.png`);
  fs.writeFileSync(outputPath, buffer);

  return outputPath;
}

async function generateAllIcons() {
  console.log('🔄 Generating icons...\n');

  for (const size of sizes) {
    try {
      const outputPath = await createIcon(size);
      console.log(`✅ Created icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Error creating icon-${size}x${size}.png:`, error.message);
    }
  }

  console.log('\n✨ All icons created successfully!');
  console.log(`📁 Icons saved to: ${publicDir}`);
  console.log('\n🚀 Your app is ready to be installed as a PWA!');
  console.log('   Next step: Run "npm run build" to generate the service worker.');
}

// Check if canvas is available
try {
  generateAllIcons().catch(console.error);
} catch (error) {
  console.error('❌ Error: Canvas library not properly installed');
  console.error('   Make sure you ran: npm install canvas --save-dev');
  console.error('\n   If installation fails, you may need to install system dependencies:');
  console.error('   Windows: Usually works with npm install');
  console.error('   Mac: brew install pkg-config cairo pango libpng jpeg giflib librsvg');
  console.error('   Linux: sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev');
  process.exit(1);
}

