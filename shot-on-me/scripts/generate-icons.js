/**
 * Simple script to generate PWA icons from a source image
 * 
 * Usage:
 * 1. Place your source icon (512x512px or larger) as 'icon-source.png' in the public folder
 * 2. Install sharp: npm install sharp --save-dev
 * 3. Run: node scripts/generate-icons.js
 * 
 * Or use an online tool like https://www.pwabuilder.com/imageGenerator
 */

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const publicDir = path.join(__dirname, '..', 'public');
const sourceIcon = path.join(publicDir, 'icon-source.png');

console.log('📱 PWA Icon Generator');
console.log('====================\n');

if (!fs.existsSync(sourceIcon)) {
  console.log('❌ Source icon not found!');
  console.log(`   Expected: ${sourceIcon}`);
  console.log('\n📝 Instructions:');
  console.log('1. Create or download a 512x512px icon');
  console.log('2. Save it as "icon-source.png" in the public/ folder');
  console.log('3. Run this script again\n');
  console.log('💡 Alternative: Use https://www.pwabuilder.com/imageGenerator');
  process.exit(1);
}

// Check if sharp is installed
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('❌ Sharp not installed!');
  console.log('\n📦 Install it with:');
  console.log('   npm install sharp --save-dev\n');
  console.log('💡 Or use an online tool: https://www.pwabuilder.com/imageGenerator');
  process.exit(1);
}

async function generateIcons() {
  console.log('🔄 Generating icons...\n');
  
  for (const size of sizes) {
    const outputPath = path.join(publicDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(sourceIcon)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 1 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Error generating icon-${size}x${size}.png:`, error.message);
    }
  }
  
  console.log('\n✨ Done! All icons generated in public/ folder');
  console.log('🚀 Your app is ready to be installed as a PWA!');
}

generateIcons().catch(console.error);

