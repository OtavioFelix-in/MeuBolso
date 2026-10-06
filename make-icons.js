// Gera todos os ícones do app (e o logo do README) a partir da arte
// assets/source-logo.png. Roda uma vez, não faz parte do build normal.
// Rodar: node make-icons.js  (precisa do sharp: npm install --no-save sharp)
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, 'assets');
const SRC = path.join(OUT, 'source-logo.png');

const BG = [11, 31, 20];
const SWOOSH = [22, 39, 29];
const CURVE = { cx: -129.5, cy: -428.6, r: 1737.3 };
const TILE = 1322;
const TILE_RADIUS = 300;
const MARK_BOX = { left: 381, top: 341, width: 564, height: 446 };

const raw = (width, height) => ({ raw: { width, height, channels: 4 } });

async function markLayers() {
  const { data, info } = await sharp(SRC).extract(MARK_BOX).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const color = Buffer.alloc(width * height * 4);
  const mono = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const p = [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];
    let a = 0;
    for (let c = 0; c < 3; c++) {
      const d = p[c] > BG[c] ? (p[c] - BG[c]) / (255 - BG[c]) : (BG[c] - p[c]) / BG[c];
      a = Math.max(a, d);
    }
    for (let c = 0; c < 3; c++) color[i * 4 + c] = a > 0 ? Math.round(Math.min(255, Math.max(0, (p[c] - BG[c]) / a + BG[c]))) : 0;
    color[i * 4 + 3] = Math.round(a * 255);
    const m = Math.min(1, Math.max(0, (p[1] - 31) / (150 - 31)));
    mono.fill(255, i * 4, i * 4 + 3);
    mono[i * 4 + 3] = Math.round(m * 255);
  }
  return { color, mono, width, height };
}

function background(size, scale, offset) {
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5 - offset) / scale;
      const v = (y + 0.5 - offset) / scale;
      const dist = Math.hypot(u - CURVE.cx, v - CURVE.cy) - CURVE.r;
      const t = Math.min(1, Math.max(0, dist * scale + 0.5));
      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) buf[i + c] = Math.round(BG[c] + (SWOOSH[c] - BG[c]) * t);
      buf[i + 3] = 255;
    }
  }
  return sharp(buf, raw(size, size));
}

const transparent = (size) => sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });

async function place(base, layer, buffer, markWidth, size, file) {
  const png = await sharp(buffer, raw(layer.width, layer.height)).resize({ width: markWidth }).png().toBuffer();
  const { height } = await sharp(png).metadata();
  await base
    .composite([{ input: png, left: Math.round((size - markWidth) / 2), top: Math.round((size - height) / 2) }])
    .png()
    .toFile(path.join(OUT, file));
}

async function run() {
  const layer = await markLayers();
  const visible = 1024 * (72 / 108);
  const safeOffset = (1024 - visible) / 2;
  const adaptiveMark = Math.round(470 * (visible / 1024));

  await place(background(1024, 1024 / TILE, 0), layer, layer.color, 470, 1024, 'icon.png');
  await background(1024, visible / TILE, safeOffset).png().toFile(path.join(OUT, 'android-icon-background.png'));
  await place(transparent(1024), layer, layer.color, adaptiveMark, 1024, 'android-icon-foreground.png');
  await place(transparent(1024), layer, layer.mono, adaptiveMark, 1024, 'android-icon-monochrome.png');
  await place(transparent(256), layer, layer.mono, 210, 256, 'notification-icon.png');
  await place(transparent(1024), layer, layer.color, 760, 1024, 'splash-icon.png');
  await sharp(path.join(OUT, 'icon.png')).resize(48, 48).png().toFile(path.join(OUT, 'favicon.png'));

  const inset = 3;
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}"><rect x="${inset}" y="${inset}" width="${TILE - inset * 2}" height="${TILE - inset * 2}" rx="${TILE_RADIUS - inset}" fill="#fff"/></svg>`
  );
  const alpha = await sharp(mask).extractChannel(3).raw().toBuffer();
  const rounded = await sharp(SRC).joinChannel(alpha, { raw: { width: TILE, height: TILE, channels: 1 } }).png().toBuffer();
  await sharp(rounded).resize(512, 512).png().toFile(path.join(OUT, 'logo.png'));

  console.log('ícones gerados em', OUT);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
