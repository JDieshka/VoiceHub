#!/usr/bin/env node

/**
 * Script to generate all required icon sizes for Tauri
 * Run: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if sharp is installed
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('❌ Sharp not installed. Run: npm install --save-dev sharp');
  process.exit(1);
}

const ICONS_DIR = path.join(__dirname, '..', 'src-tauri', 'icons');
const SOURCE_ICON = path.join(__dirname, '..', 'public', 'icon-1024.png');

// Required icon sizes for Tauri
const ICON_SIZES = [
  { size: 32, name: '32x32.png' },
  { size: 128, name: '128x128.png' },
  { size: 256, name: '128x128@2x.png' },
  { size: 512, name: 'icon.png' },
  { size: 64, name: 'tray.png' },
];

async function generateIcons() {
  console.log('🎨 Generating Tauri icons...\n');

  // Create icons directory if it doesn't exist
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
    console.log(`✓ Created directory: ${ICONS_DIR}`);
  }

  // Check if source icon exists
  if (!fs.existsSync(SOURCE_ICON)) {
    console.error(`❌ Source icon not found: ${SOURCE_ICON}`);
    console.error('Please place a 1024x1024 icon at public/icon-1024.png');
    process.exit(1);
  }

  // Generate PNG icons
  for (const icon of ICON_SIZES) {
    const outputPath = path.join(ICONS_DIR, icon.name);
    try {
      await sharp(SOURCE_ICON)
        .resize(icon.size, icon.size)
        .png()
        .toFile(outputPath);
      console.log(`✓ Generated: ${icon.name} (${icon.size}x${icon.size})`);
    } catch (e) {
      console.error(`❌ Failed to generate ${icon.name}:`, e.message);
    }
  }

  // Generate ICO file for Windows
  console.log('\n📦 Generating Windows ICO file...');
  try {
    // Create ICO from multiple PNG sizes
    const icoSizes = [16, 24, 32, 48, 64, 128, 256];
    const pngBuffers = [];

    for (const size of icoSizes) {
      const buffer = await sharp(SOURCE_ICON)
        .resize(size, size)
        .png()
        .toBuffer();
      pngBuffers.push({ size, buffer });
    }

    // Simple ICO file creator
    const icoBuffer = createICO(pngBuffers);
    const icoPath = path.join(ICONS_DIR, 'icon.ico');
    fs.writeFileSync(icoPath, icoBuffer);
    console.log(`✓ Generated: icon.ico`);
  } catch (e) {
    console.error('❌ Failed to generate ICO:', e.message);
    console.log('\n💡 Alternative: Use online converter');
    console.log('   https://convertico.com/');
  }

  console.log('\n✅ Icon generation complete!');
  console.log(`\n📁 Icons saved to: ${ICONS_DIR}`);
}

// Simple ICO file creator
function createICO(images) {
  const headerSize = 6;
  const dirEntrySize = 16;
  const numImages = images.length;
  
  let offset = headerSize + (dirEntrySize * numImages);
  const dataBuffers = [];
  
  // Create directory entries
  const dirEntries = images.map(img => {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 0); // width
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 1); // height
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset to image data
    
    offset += img.buffer.length;
    dataBuffers.push(img.buffer);
    
    return entry;
  });
  
  // Create header
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type (1 = ICO)
  header.writeUInt16LE(numImages, 4); // number of images
  
  // Combine all parts
  return Buffer.concat([header, ...dirEntries, ...dataBuffers]);
}

generateIcons().catch(console.error);
