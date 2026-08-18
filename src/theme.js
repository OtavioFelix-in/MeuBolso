// Paletas (clara/escura), catálogos fixos e as categorias que já vêm prontas
// na primeira abertura. Os componentes pegam a paleta ativa via useTheme().

// Tipografia: Inter — a mesma fonte usada pelo Banco Inter (o "Inter" do nome
// é literalmente essa família). Reta, neutra, feita pra interface financeira,
// com algarismo tabular nativo (sem precisar de uma fonte mono separada pros
// valores). Carregada via @expo-google-fonts em App.js; aqui só os nomes.
export const FONT_FAMILY = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  mono: 'Inter_500Medium',
  monoBold: 'Inter_700Bold',
};

// Algarismo tabular (todo dígito com a mesma largura) pros valores em
// dinheiro alinharem em coluna — recurso nativo da Inter, sem trocar de fonte.
export const TABULAR_NUMS = { fontVariant: ['tabular-nums'] };

// Os componentes de ui.js/fields.js já usavam `fontWeight` (herdado da fonte
// do sistema, que sintetiza qualquer peso). Fonte custom não faz isso — cada
// peso é uma família separada — então esse helper traduz o peso pedido pra
// família certa, sem precisar reescrever `fontWeight` em cada tela.
export function fontForWeight(weight) {
  const w = String(weight);
  if (w === '800' || w === '700') return FONT_FAMILY.bold;
  if (w === '600') return FONT_FAMILY.semibold;
  if (w === '500') return FONT_FAMILY.medium;
  return FONT_FAMILY.regular;
}

// Escala de raio — mais reta, menos "bolha". Usada em vez de número solto
// por componente (Card, Button, Chip... cada um tinha o seu antes).
export const RADIUS = { sm: 6, md: 10, lg: 14, xl: 20 };

// Gradiente de marca (verde escuro -> preto), o mesmo do ícone do app. Usado
// com moderação nos momentos de destaque (cartão de resultado do mês,
// splash, boas-vindas do onboarding) — não em todo card, senão perde força.
export const BRAND_GRADIENT = ['#154D37', '#0B2A1F', '#050605'];
export const BRAND_GRADIENT_ANGLE = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };

export const palettes = {
  light: {
    background: '#F4F6FB',
    card: '#FFFFFF',
    cardAlt: '#EDF1F8',
    primary: '#00A870',
    primaryDark: '#00845A',
    primaryLight: '#DCF3EA',
    text: '#101828',
    textMuted: '#697586',
    border: '#E4E9F2',
    income: '#00A870',
    expense: '#E5484D',
    invest: '#7C5CFC',
    warning: '#E8940F',
    overlay: 'rgba(16, 24, 40, 0.45)',
    onPrimary: '#FFFFFF',
  },
  dark: {
    background: '#0A0A0B',
    card: '#18181B',
    cardAlt: '#222225',
    primary: '#23966B',
    primaryDark: '#1B7A56',
    primaryLight: '#16241E',
    text: '#EDEDEF',
    textMuted: '#8E8E93',
    border: '#2A2A2E',
    income: '#3EA372',
    expense: '#D5555A',
    invest: '#8B7CD8',
    warning: '#C98A3E',
    overlay: 'rgba(0, 0, 0, 0.6)',
    onPrimary: '#FFFFFF',
  },
};

// Paleta usada nos gráficos e ao criar categorias/metas/investimentos novos.
export const CHART_COLORS = [
  '#00A870', '#4C6FFF', '#E5484D', '#E8940F', '#7C5CFC',
  '#00B8D9', '#EC4899', '#84CC16', '#F97316', '#0EA5E9',
  '#14B8A6', '#A855F7', '#EF4444', '#22C55E', '#6366F1',
];

export const ACCOUNT_TYPES = [
  { key: 'corrente', label: 'Conta corrente', emoji: '🏦' },
  { key: 'poupanca', label: 'Poupança', emoji: '🐷' },
  { key: 'dinheiro', label: 'Dinheiro', emoji: '💵' },
  { key: 'credito', label: 'Cartão de crédito', emoji: '💳' },
  { key: 'vale', label: 'Vale / benefício', emoji: '🎟️' },
];

export const PAYMENT_METHODS = [
  { key: 'pix', label: 'Pix', emoji: '⚡' },
  { key: 'debito', label: 'Débito', emoji: '💳' },
  { key: 'credito', label: 'Crédito', emoji: '💳' },
  { key: 'dinheiro', label: 'Dinheiro', emoji: '💵' },
  { key: 'boleto', label: 'Boleto', emoji: '🧾' },
  { key: 'transferencia', label: 'Transferência', emoji: '🔁' },
];

export const INVESTMENT_TYPES = [
  { key: 'cdb', label: 'CDB', emoji: '🏦', color: '#4C6FFF' },
  { key: 'tesouro', label: 'Tesouro Direto', emoji: '🇧🇷', color: '#00A870' },
  { key: 'acoes', label: 'Ações', emoji: '📈', color: '#E8940F' },
  { key: 'fiis', label: 'FIIs', emoji: '🏢', color: '#00B8D9' },
  { key: 'etf', label: 'ETFs', emoji: '🌎', color: '#7C5CFC' },
  { key: 'cripto', label: 'Criptomoedas', emoji: '₿', color: '#F97316' },
  { key: 'remunerada', label: 'Conta remunerada', emoji: '💰', color: '#84CC16' },
  { key: 'outro', label: 'Outro', emoji: '📦', color: '#697586' },
];

export const ASSET_TYPES = [
  { key: 'imovel', label: 'Imóvel', emoji: '🏠' },
  { key: 'veiculo', label: 'Veículo', emoji: '🚗' },
  { key: 'moto', label: 'Moto', emoji: '🏍️' },
  { key: 'eletronico', label: 'Eletrônico', emoji: '💻' },
  { key: 'outro', label: 'Outro', emoji: '📦' },
];

// Categorias iniciais. `subs` viram subcategorias (categoria com parent_id).
export const DEFAULT_CATEGORIES = {
  expense: [
    { name: 'Alimentação', emoji: '🍽️', color: '#E8940F', essential: true, subs: ['Mercado', 'Restaurante', 'Delivery', 'Lanche'] },
    { name: 'Transporte', emoji: '🚌', color: '#4C6FFF', essential: true, subs: ['Combustível', 'App de corrida', 'Ônibus', 'Manutenção', 'Estacionamento'] },
    { name: 'Moradia', emoji: '🏠', color: '#00B8D9', essential: true, subs: ['Aluguel', 'Energia', 'Água', 'Internet', 'Gás', 'Condomínio'] },
    { name: 'Educação', emoji: '🎓', color: '#7C5CFC', essential: true, subs: ['Mensalidade', 'Material', 'Cursos', 'Livros'] },
    { name: 'Saúde', emoji: '🩺', color: '#EC4899', essential: true, subs: ['Farmácia', 'Consultas', 'Plano de saúde', 'Exames'] },
    { name: 'Academia', emoji: '🏋️', color: '#84CC16', subs: ['Mensalidade', 'Suplementos'] },
    { name: 'Lazer', emoji: '🎮', color: '#F97316', subs: ['Cinema', 'Bar', 'Jogos', 'Eventos'] },
    { name: 'Compras', emoji: '🛍️', color: '#A855F7', subs: ['Roupas', 'Eletrônicos', 'Casa', 'Presentes'] },
    { name: 'Assinaturas', emoji: '📺', color: '#E5484D', subs: ['Netflix', 'Spotify', 'Celular', 'Outros apps'] },
    { name: 'Relacionamento', emoji: '💞', color: '#EC4899', subs: ['Presentes', 'Encontros', 'Viagens', 'Datas comemorativas', 'Outros'] },
    { name: 'Família', emoji: '👨‍👩‍👧', color: '#0EA5E9', subs: ['Ajuda', 'Presentes'] },
    { name: 'Pets', emoji: '🐶', color: '#14B8A6', subs: ['Ração', 'Veterinário', 'Banho e tosa'] },
    { name: 'Viagens', emoji: '✈️', color: '#22C55E', subs: ['Passagens', 'Hospedagem', 'Passeios'] },
    { name: 'Impostos e taxas', emoji: '🧾', color: '#697586', essential: true, subs: ['Tarifas', 'IPVA', 'IPTU'] },
    { name: 'Outros', emoji: '📦', color: '#697586', subs: [] },
  ],
  income: [
    { name: 'Salário', emoji: '💼', color: '#00A870', subs: ['Adiantamento', '13º', 'Férias'] },
    { name: 'Freelance', emoji: '💻', color: '#4C6FFF', subs: [] },
    { name: 'Renda extra', emoji: '🚀', color: '#E8940F', subs: ['Vendas', 'Bicos'] },
    { name: 'Presentes', emoji: '🎁', color: '#EC4899', subs: [] },
    { name: 'Rendimentos', emoji: '📈', color: '#7C5CFC', subs: ['Juros', 'Dividendos'] },
    { name: 'Reembolso', emoji: '↩️', color: '#00B8D9', subs: [] },
    { name: 'Outros', emoji: '📦', color: '#697586', subs: [] },
  ],
};

// Contas criadas junto com o banco, pra ninguém começar do zero absoluto.
export const DEFAULT_ACCOUNTS = [
  { name: 'Carteira', type: 'dinheiro', emoji: '💵', color: '#84CC16' },
  { name: 'Conta do banco', type: 'corrente', emoji: '🏦', color: '#4C6FFF' },
];
