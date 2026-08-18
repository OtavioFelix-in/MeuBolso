// Gera os ícones do app a partir da nova arte (assets/source-icon.png).
// Roda uma vez, não faz parte do build normal.
// Rodar: node make-icons.js  (precisa do sharp: npm install --no-save sharp)
const sharp = require('sharp');
const path = require('path');

const OUT = path.join(__dirname, 'assets');
const SRC = path.join(OUT, 'source-icon.png');

// Gradiente de marca: verde escuro -> preto.
const GRAD = `
  <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#12432F"/>
        <stop offset="0.55" stop-color="#0A2119"/>
        <stop offset="1" stop-color="#050605"/>
      </linearGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#g)"/>
  </svg>`;

// "M" simples pro monocromático / ícone de notificação (a arte principal não
// separa o desenho do fundo num PNG só, então esses dois usam um traço próprio).
const mGlyph = (color) => `
  <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <path d="M 300 720 L 300 320 L 420 320 L 512 460 L 604 320 L 724 320 L 724 720 L 634 720 L 634 460 L 550 580 L 474 580 L 390 460 L 390 720 Z"
      fill="${color}"/>
  </svg>`;

async function run() {
  const meta = await sharp(SRC).metadata();
  const { width: W, height: H } = meta;

  // Acha a caixa do desenho (ignora a moldura transparente ao redor).
  const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  let minX = W, maxX = 0, minY = H, maxY = 0;
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const a = data[(y * W + x) * ch + 3];
      if (a > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const side = Math.min(W, Math.max(maxX - minX, maxY - minY) + 40);
  const left = Math.max(0, Math.round(cx - side / 2));
  const top = Math.max(0, Math.round(cy - side / 2));
  const size = Math.min(side, W - left, H - top);

  const cropped = sharp(SRC).extract({ left, top, width: size, height: size });

  // 1) Ícone principal (iOS/geral): a arte já preenche o quadro.
  await cropped.clone().resize(1024, 1024).png().toFile(path.join(OUT, 'icon.png'));

  // 2) Android adaptive — frente: a mesma arte, um pouco menor (zona segura),
  //    centralizada num quadro transparente.
  const fgArt = await cropped.clone().resize(700, 700).png().toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fgArt, left: 162, top: 162 }])
    .png()
    .toFile(path.join(OUT, 'android-icon-foreground.png'));

  // 3) Android adaptive — fundo: gradiente de marca (verde escuro -> preto).
  await sharp(Buffer.from(GRAD)).png().toFile(path.join(OUT, 'android-icon-background.png'));

  // 4) Monocromático (Material You) e ícone de notificação: um "M" sólido,
  //    já que a arte principal não separa traço de fundo num PNG só.
  await sharp(Buffer.from(mGlyph('#FFFFFF'))).png().toFile(path.join(OUT, 'android-icon-monochrome.png'));
  await sharp(Buffer.from(mGlyph('#FFFFFF'))).resize(256, 256).png().toFile(path.join(OUT, 'notification-icon.png'));

  // 5) Splash: a arte, um pouco menor, sobre fundo transparente (o app.json
  //    define a cor de fundo da tela de splash separadamente).
  const splashArt = await cropped.clone().resize(560, 560).png().toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: splashArt, left: 232, top: 232 }])
    .png()
    .toFile(path.join(OUT, 'splash-icon.png'));

  // 6) Favicon web.
  await cropped.clone().resize(48, 48).png().toFile(path.join(OUT, 'favicon.png'));

  console.log('bbox', { minX, maxX, minY, maxY, side, left, top, size });
  console.log('ícones gerados em', OUT);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
