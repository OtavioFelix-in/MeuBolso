// Gera todos os ícones do app (e o logo do README) a partir da marca
// vetorial: o "M" com a carteira. Roda uma vez, não faz parte do build normal.
// Rodar: node make-icons.js  (precisa do sharp: npm install --no-save sharp)
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, 'assets');

const COLORS = { dark: '#0B1F14', green: '#3DDB84', white: '#FFFFFF' };

const BOX = { x: 203, y: 250, w: 318, h: 241 };
const STROKE = 44;
const M_PATH = 'M224.5 469V272L341.5 389L458.5 272V334';
const WALLET = { x: 387, y: 371, w: 134, h: 98, r: 20 };
const DOT = { cx: 485.5, cy: 420, r: 14 };
const TILE_OFFSET = { x: 2.5 / 719, y: 11 / 719 };

function mark({ size, fg, markWidth, bg = null, radius = 0 }) {
  const k = markWidth / BOX.w;
  const shift = bg ? TILE_OFFSET : { x: 0, y: 0 };
  const tx = size / 2 + shift.x * size - (BOX.x + BOX.w / 2) * k;
  const ty = size / 2 + shift.y * size - (BOX.y + BOX.h / 2) * k;
  const background = bg ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <mask id="hole" maskUnits="userSpaceOnUse" x="0" y="0" width="719" height="719">
      <rect width="719" height="719" fill="#fff"/>
      <circle cx="${DOT.cx}" cy="${DOT.cy}" r="${DOT.r}" fill="#000"/>
    </mask>
  </defs>
  ${background}
  <g transform="translate(${tx} ${ty}) scale(${k})">
    <path d="${M_PATH}" fill="none" stroke="${fg}" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="${WALLET.x}" y="${WALLET.y}" width="${WALLET.w}" height="${WALLET.h}" rx="${WALLET.r}" fill="${fg}" mask="url(#hole)"/>
  </g>
</svg>`;
}

const png = (svg, file) => sharp(Buffer.from(svg)).png().toFile(path.join(OUT, file));

async function run() {
  const tile = (size, radius = 0) => mark({ size, fg: COLORS.green, bg: COLORS.dark, markWidth: size * (318 / 719), radius });

  await png(tile(1024), 'icon.png');
  await png(mark({ size: 1024, fg: COLORS.green, markWidth: 300 }), 'android-icon-foreground.png');
  await png(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${COLORS.dark}"/></svg>`, 'android-icon-background.png');
  await png(mark({ size: 1024, fg: COLORS.white, markWidth: 300 }), 'android-icon-monochrome.png');
  await png(mark({ size: 256, fg: COLORS.white, markWidth: 210 }), 'notification-icon.png');
  await png(mark({ size: 1024, fg: COLORS.green, markWidth: 760 }), 'splash-icon.png');
  await png(tile(48, 11), 'favicon.png');
  await png(tile(512, 116), 'logo.png');
  fs.writeFileSync(path.join(OUT, 'logo.svg'), tile(512, 116));

  console.log('ícones gerados em', OUT);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
