const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const toIco = require('to-ico');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// Generate PNG icon with book emoji
function generatePng(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background - nice blue gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#4F46E5');  // Indigo
  gradient.addColorStop(1, '#7C3AED');  // Purple
  ctx.fillStyle = gradient;

  // Rounded rectangle background
  const radius = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // Draw book emoji
  ctx.font = `${size * 0.6}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  ctx.fillText('📖', size / 2, size / 2);

  const buffer = canvas.toBuffer('image/png');
  const filepath = path.join(ASSETS_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  console.log(`Generated: ${filepath}`);
  return filepath;
}

async function main() {
  console.log('Generating app icons...\n');

  // Generate different sizes for various purposes
  const icon256 = generatePng(256, 'icon-256.png');
  generatePng(512, 'icon-512.png');
  generatePng(1024, 'icon-1024.png');
  generatePng(128, 'icon-128.png');
  generatePng(64, 'icon-64.png');
  generatePng(32, 'icon-32.png');
  generatePng(16, 'icon-16.png');

  // Generate Windows .ico file
  try {
    const pngFiles = [
      fs.readFileSync(path.join(ASSETS_DIR, 'icon-256.png')),
      fs.readFileSync(path.join(ASSETS_DIR, 'icon-128.png')),
      fs.readFileSync(path.join(ASSETS_DIR, 'icon-64.png')),
      fs.readFileSync(path.join(ASSETS_DIR, 'icon-32.png')),
      fs.readFileSync(path.join(ASSETS_DIR, 'icon-16.png')),
    ];
    const icoBuffer = await toIco(pngFiles);
    fs.writeFileSync(path.join(ASSETS_DIR, 'icon.ico'), icoBuffer);
    console.log(`Generated: ${path.join(ASSETS_DIR, 'icon.ico')}`);
  } catch (err) {
    console.error('Error generating .ico:', err.message);
  }

  console.log('\nNote: For macOS .icns file, you need to use iconutil on a Mac');
  console.log('or use an online converter with the icon-1024.png file.');
  console.log('\nDone!');
}

main().catch(console.error);
