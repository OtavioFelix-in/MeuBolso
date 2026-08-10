// Dinheiro é sempre guardado em CENTAVOS (inteiro). Assim 0,1 + 0,2 nunca vira
// 0,30000000000000004 e as somas do banco batem até o último centavo.

export function formatMoney(cents, { sign = false, symbol = true } = {}) {
  const value = Math.round(cents ?? 0);
  const negative = value < 0;
  const abs = Math.abs(value);
  const reais = Math.floor(abs / 100);
  const centavos = String(abs % 100).padStart(2, '0');

  const grouped = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const prefix = symbol ? 'R$ ' : '';
  const signal = negative ? '-' : sign && value > 0 ? '+' : '';

  return `${signal}${prefix}${grouped},${centavos}`;
}

// Versão curta pros eixos dos gráficos: R$ 1,2 mil / R$ 3,4 mi.
export function formatMoneyShort(cents) {
  const value = Math.abs(Math.round(cents ?? 0)) / 100;
  const signal = cents < 0 ? '-' : '';
  if (value >= 1_000_000) return `${signal}${trimZero(value / 1_000_000)} mi`;
  if (value >= 1000) return `${signal}${trimZero(value / 1000)} mil`;
  return `${signal}${Math.round(value)}`;
}

function trimZero(n) {
  return n.toFixed(1).replace('.0', '').replace('.', ',');
}

// O campo de valor é "caixa de supermercado": a pessoa digita só números e eles
// entram pela direita (12 -> 0,12 -> 1,25). Aqui guardamos só os dígitos.
export function digitsToCents(digits) {
  const clean = String(digits ?? '').replace(/\D/g, '').slice(0, 12);
  return clean === '' ? 0 : parseInt(clean, 10);
}

export function centsToDigits(cents) {
  if (!cents) return '';
  return String(Math.round(Math.abs(cents)));
}

export function formatPercent(value, decimals = 0) {
  if (!isFinite(value)) return '—';
  return `${value.toFixed(decimals).replace('.', ',')}%`;
}

// Divide um total em N parcelas sem perder centavo: a diferença vai na primeira.
export function splitInstallments(totalCents, count) {
  const base = Math.floor(totalCents / count);
  const rest = totalCents - base * count;
  return Array.from({ length: count }, (_, i) => (i === 0 ? base + rest : base));
}
