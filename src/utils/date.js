// Datas em pt-BR sem depender do locale do aparelho.
// Convenção do app: data de lançamento é uma string 'YYYY-MM-DD' (hora local) e
// mês é uma string 'YYYY-MM'. Isso deixa os agrupamentos do SQLite triviais.

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTHS_FULL = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const MONTH_LABELS = MONTHS;

function pad(n) {
  return String(n).padStart(2, '0');
}

export function toIsoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// 'YYYY-MM-DD' -> Date local (new Date('2026-01-05') seria UTC e voltaria um dia).
export function fromIsoDate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function today() {
  return toIsoDate(new Date());
}

export function monthOf(iso) {
  return String(iso).slice(0, 7);
}

export function currentMonth() {
  return monthOf(today());
}

export function monthKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

// Soma meses a um 'YYYY-MM'.
export function addMonths(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return monthKey(date);
}

// Lista de meses terminando em `month` (inclusive), do mais antigo pro mais novo.
export function lastMonths(month, count) {
  return Array.from({ length: count }, (_, i) => addMonths(month, i - count + 1));
}

export function monthLabel(month, { full = false } = {}) {
  const [y, m] = month.split('-').map(Number);
  return full ? `${MONTHS_FULL[m - 1]} de ${y}` : `${MONTHS[m - 1]}/${String(y).slice(2)}`;
}

export function monthShort(month) {
  return MONTHS[Number(month.split('-')[1]) - 1];
}

export function formatDate(iso) {
  const d = fromIsoDate(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatDateLong(iso) {
  const d = fromIsoDate(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS_FULL[d.getMonth()]}`;
}

export function formatDayMonth(iso) {
  const d = fromIsoDate(iso);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}`;
}

export function daysBetween(isoA, isoB) {
  return Math.round((fromIsoDate(isoB) - fromIsoDate(isoA)) / 86400000);
}

export function daysUntil(iso) {
  return daysBetween(today(), iso);
}

// Rótulo humano pro vencimento ("vence hoje", "em 3 dias", "5 dias atrasado").
export function dueLabel(iso) {
  const days = daysUntil(iso);
  if (days === 0) return 'vence hoje';
  if (days === 1) return 'vence amanhã';
  if (days === -1) return '1 dia atrasado';
  if (days < 0) return `${-days} dias atrasado`;
  return `em ${days} dias`;
}

export function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

// Vencimento do mês respeitando meses curtos (dia 31 em fevereiro vira 28/29).
export function dueDateFor(month, day) {
  const last = daysInMonth(month);
  return `${month}-${pad(Math.min(day, last))}`;
}

export function isSameDay(isoA, isoB) {
  return isoA === isoB;
}

// Matriz do mês pro calendário: semanas de 7 posições (null nos vazios).
export function monthMatrix(month) {
  const [y, m] = month.split('-').map(Number);
  const firstWeekday = new Date(y, m - 1, 1).getDay();
  const total = daysInMonth(month);

  const weeks = [];
  let week = new Array(firstWeekday).fill(null);
  for (let day = 1; day <= total; day++) {
    week.push(`${month}-${pad(day)}`);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push([...week, ...new Array(7 - week.length).fill(null)]);
  return weeks;
}

// Data (com hora) pra agendar a notificação de um vencimento.
export function reminderDate(iso, daysBefore, hour = 9) {
  const d = fromIsoDate(iso);
  d.setDate(d.getDate() - daysBefore);
  d.setHours(hour, 0, 0, 0);
  return d;
}
