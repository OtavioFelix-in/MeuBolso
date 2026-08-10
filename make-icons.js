// Gera os ícones do Meu Bolso a partir de um desenho vetorial (SVG) — carteira
// branca com uma nota e uma moeda saindo, sobre o verde da marca.
// Sem texto de propósito: fica legível até no ícone pequeno da gaveta de apps.
//
// Rodar:  node make-icons.js   (precisa do sharp: npm install --no-save sharp)

const sharp = require('sharp');
const path = require('path');

const OUT = path.join(__dirname, 'assets');

const GREEN = '#00A870';
const GREEN_DARK = '#00845A';
const PALE = '#DCF3EA';
const NOTE = '#A9E9CF';

const GRADIENT = `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2ED396"/>
      <stop offset="1" stop-color="${GREEN}"/>
    </linearGradient>
  </defs>`;

// Carteira colorida (nota + moeda saindo por cima, corpo branco, bolso e botão).
const wallet = `
  <rect x="322" y="284" width="380" height="156" rx="40" fill="${NOTE}"/>
  <circle cx="512" cy="356" r="34" fill="${GREEN}"/>
  <rect x="232" y="392" width="560" height="342" rx="76" fill="#FFFFFF"/>
  <rect x="540" y="486" width="252" height="154" rx="77" fill="${PALE}"/>
  <circle cx="666" cy="563" r="48" fill="${GREEN}"/>
  <circle cx="666" cy="563" r="17" fill="${PALE}"/>`;

// Silhueta branca (barra de status / monocromático): só o corpo, com o botão vazado.
const walletMono = (color) => `
  <mask id="m">
    <rect width="1024" height="1024" fill="white"/>
    <circle cx="666" cy="563" r="30" fill="black"/>
  </mask>
  <g mask="url(#m)">
    <rect x="322" y="286" width="380" height="150" rx="38" fill="${color}"/>
    <rect x="232" y="392" width="560" height="342" rx="76" fill="${color}"/>
  </g>`;

const svg = (size, body) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

const center = (scale, body) => {
  const off = (1024 * (1 - scale)) / 2;
  return `<g transform="translate(${off},${off}) scale(${scale})">${body}</g>`;
};

const files = {
  // Ícone principal (iOS/geral): fundo em degradê verde + carteira.
  'icon.png': svg(1024, `${GRADIENT}<rect width="1024" height="1024" fill="url(#g)"/>${center(0.86, wallet)}`),
  // Android adaptive — frente: carteira na zona segura, fundo transparente.
  'android-icon-foreground.png': svg(1024, center(0.58, wallet)),
  // Android adaptive — fundo: só o degradê (usado se quiser imagem no lugar da cor).
  'android-icon-background.png': svg(1024, `${GRADIENT}<rect width="1024" height="1024" fill="url(#g)"/>`),
  // Android adaptive — monocromático (tema material you): silhueta branca.
  'android-icon-monochrome.png': svg(1024, center(0.58, walletMono('#FFFFFF'))),
  // Splash: carteira verde em fundo transparente.
  'splash-icon.png': svg(1024, center(0.5, walletMono(GREEN_DARK))),
  // Ícone da notificação (barra de status): silhueta branca.
  'notification-icon.png': svg(256, center(0.86, walletMono('#FFFFFF'))),
  // Favicon web.
  'favicon.png': svg(48, `${GRADIENT}<rect width="1024" height="1024" fill="url(#g)"/>${center(0.7, wallet)}`),
};

(async () => {
  for (const [name, content] of Object.entries(files)) {
    await sharp(Buffer.from(content)).png().toFile(path.join(OUT, name));
    console.log('gerado:', name);
  }
})();
