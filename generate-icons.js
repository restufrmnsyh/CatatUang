/**
 * generate-icons.js
 * Jalankan sekali dengan: node generate-icons.js
 * Membutuhkan: npm install canvas (opsional) ATAU cukup buat SVG inline.
 *
 * Script ini membuat icons/icon-192.png dan icons/icon-512.png
 * menggunakan canvas built-in Node.js (via @napi-rs/canvas jika ada),
 * atau menulis SVG sebagai fallback yang bisa dibuka browser.
 */

const fs   = require('fs');
const path = require('path');

function makeIconSVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#2563eb"/>
  <text x="50%" y="56%" font-family="system-ui,sans-serif" font-size="${size * 0.42}"
        font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">₹</text>
</svg>`;
}

// Write SVG icons (can be used as fallback; rename to .svg if needed)
fs.writeFileSync(path.join(__dirname, 'icons', 'icon-192.svg'), makeIconSVG(192));
fs.writeFileSync(path.join(__dirname, 'icons', 'icon-512.svg'), makeIconSVG(512));

console.log('SVG icons written to icons/. Convert to PNG with: npx sharp-cli or any image tool.');
console.log('Or use icons/*.svg directly (update manifest.json type to image/svg+xml).');
